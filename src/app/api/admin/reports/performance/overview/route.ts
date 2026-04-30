
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Assuming this is where authOptions are
import { prisma } from "@/lib/prisma"; // Assuming this is where prisma client is
import * as XLSX from "@e965/xlsx";
import { startOfDay, endOfDay, subDays, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        // Default to last 30 days if no date range provided
        const startDate = dateFrom ? startOfDay(parseISO(dateFrom)) : startOfDay(subDays(new Date(), 30));
        const endDate = dateTo ? endOfDay(parseISO(dateTo)) : endOfDay(new Date());

        // Fetch Visa Applications
        const visaApplications = await prisma.application.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                User_Application_userIdToUser: true, // Customer
                User_Application_processedByIdToUser: true, // Admin/Agent who processed it
                Payment: true,
            },
        });

        // Fetch Tour Bookings
        const tourBookings = await prisma.booking.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                User_Booking_userIdToUser: true, // Customer
                User_Booking_processedByIdToUser: true, // Admin/Agent
                Payment: true,
                BookingAddOn: true,
            },
        });

        // Aggregate Data
        // We want to group by "Entity" (User who owns the transaction OR Admin who processed it? 
        // Request says "Entity Category", "Entity ID". 
        // Usually "Performance Overview" refers to the performance of Sales Agents/Admins.
        // However, it could also mean performance of B2B Agents.
        // For now, I will aggregate by the *Processed By* user if available, otherwise the *User* (if self-service).
        // Actually, let's group by the "Owner" of the transaction revenue context.
        // If it's an internal admin processing, the entity is that Admin.
        // If it's a B2B agent, the entity is that Agent.

        // Let's create a map to hold the aggregated data
        const entityStats = new Map<string, any>();

        // Helper to initialize or update stats
        const updateStats = (entityId: string, entity: any, type: "Visa" | "Tour", amount: number, payments: any[], status: string) => {
            if (!entityId) return;

            if (!entityStats.has(entityId)) {
                entityStats.set(entityId, {
                    entityId: entityId,
                    entityName: entity.name || "Unknown",
                    entityCategory: entity.role || "Unknown", // Admin, Customer, etc.
                    department: "Sales", // Placeholder
                    transactions: 0,
                    grossRevenue: 0,
                    discount: 0,
                    refund: 0,
                    netRevenue: 0,
                    gst: 0,
                    visaCount: 0,
                    tourCount: 0,
                    successfulTransactions: 0,
                });
            }

            const stats = entityStats.get(entityId);
            stats.transactions += 1;

            // Revenue logic (simplified)
            // Assuming 'amount' is Gross. 
            // Need to check Payment for discounts.
            const totalDiscount = payments.reduce((sum: number, p: any) => sum + (p.discountAmount || 0), 0);
            /* 
               GST Logic: 
               This is complex without explicit tax fields. 
               I will assume inclusive GST of 18% for now or 0 if not tracked, 
               to avoid misleading data. Let's send 0 for now.
            */

            stats.grossRevenue += amount;
            stats.discount += totalDiscount;
            stats.netRevenue += (amount - totalDiscount);

            if (type === "Visa") stats.visaCount += 1;
            if (type === "Tour") stats.tourCount += 1;

            if (status === "APPROVED" || status === "COMPLETED" || status === "PAID") {
                stats.successfulTransactions += 1;
            }
        };

        // Process Visas
        visaApplications.forEach(app => {
            // Who is the "Entity"? 
            // If processedById exists, it's the Admin/Staff. 
            // If not, it might be a direct customer booking.
            // The user wants "Entity Category".
            // Let's attribute to the 'processedById' if it exists (Admin perf), 
            // AND/OR the 'userId' if they are an AGENT. 
            // Since this is likely an Admin Performance Report, let's prioritize processedById.
            // If processedById is null, we stick it in "System/Self-Service".

            const entityId = app.processedById || "system";
            const entity = app.User_Application_processedByIdToUser || { name: "System / Self-Serve", role: "SYSTEM" };

            updateStats(entityId, entity, "Visa", app.totalAmount, app.Payment, app.status);
        });

        // Process Tours
        tourBookings.forEach(booking => {
            const entityId = booking.processedById || "system";
            const entity = booking.User_Booking_processedByIdToUser || { name: "System / Self-Serve", role: "SYSTEM" };

            updateStats(entityId, entity, "Tour", booking.totalAmount, booking.Payment, booking.status);
        });

        // Convert map to array and format
        const finalRows = Array.from(entityStats.values()).map((stat, index) => ({
            srNo: index + 1,
            reviewPeriod: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
            entityCategory: stat.entityCategory,
            entityId: stat.entityId,
            entityName: stat.entityName,
            department: stat.department,
            productCategory: stat.visaCount > stat.tourCount ? "Visa" : (stat.tourCount > 0 ? "Tour" : "Mixed"),
            serviceType: "Online", // Placeholder
            channel: "Web", // Placeholder
            transactions: stat.transactions,
            grossRevenue: stat.grossRevenue,
            discount: stat.discount,
            refund: stat.refund,
            netRevenue: stat.netRevenue,
            gst: stat.gst,
            avgValue: stat.transactions > 0 ? (stat.grossRevenue / stat.transactions) : 0,
            newAdditions: 0,
            repeatPercentage: 0,
            crossSellRatio: 0,
            slaPercentage: 0,
            targetRevenue: 0,
            targetAchievedPercentage: 0,
            performanceRating: "N/A",
            incentiveEligible: "No",
            status: "Active"
        }));

        const format = searchParams.get("format");

        if (format === "xlsx" || format === "csv") {
            const exportData = finalRows.map(row => ({
                "Sr No": row.srNo,
                "Review Period": row.reviewPeriod,
                "Entity Category": row.entityCategory,
                "Entity ID": row.entityId,
                "Entity Name": row.entityName,
                "Department": row.department,
                "Product Category": row.productCategory,
                "Service Type": row.serviceType,
                "Channel": row.channel,
                "Transactions": row.transactions,
                "Gross Revenue (INR)": row.grossRevenue,
                "Discount (INR)": row.discount,
                "Refund (INR)": row.refund,
                "Net Revenue (INR)": row.netRevenue,
                "GST (INR)": row.gst,
                "Avg Value (INR)": row.avgValue.toFixed(2),
                "New Additions": row.newAdditions,
                "Repeat %": row.repeatPercentage,
                "Cross-Sell Ratio": row.crossSellRatio,
                "SLA %": row.slaPercentage,
                "Target Revenue (INR)": row.targetRevenue,
                "Target Achieved %": row.targetAchievedPercentage,
                "Performance Rating": row.performanceRating,
                "Incentive Eligible": row.incentiveEligible,
                "Status": row.status
            }));

            if (format === "xlsx") {
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Performance Overview");
                const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
                return new NextResponse(buffer, {
                    headers: {
                        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "Content-Disposition": `attachment; filename=performance-overview-${new Date().toISOString().split("T")[0]}.xlsx`,
                    },
                });
            } else {
                const csv = [
                    Object.keys(exportData[0] || {}).join(","),
                    ...exportData.map((row: any) =>
                        Object.values(row).map((v: any) => {
                            const str = String(v);
                            return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
                        }).join(",")
                    ),
                ].join("\n");
                return new NextResponse(csv, {
                    headers: {
                        "Content-Type": "text/csv",
                        "Content-Disposition": `attachment; filename=performance-overview-${new Date().toISOString().split("T")[0]}.csv`,
                    },
                });
            }
        }

        return NextResponse.json({ rows: finalRows });

    } catch (error: any) {
        console.error("Error generating performance report:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
