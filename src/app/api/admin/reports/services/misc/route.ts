import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "@e965/xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (session.user.role !== "SUPER_ADMIN") {
            return NextResponse.json(
                { error: "Forbidden - Super Admin access required" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const status = searchParams.get("status");
        const format = searchParams.get("format");
        const selectedColumns = searchParams.getAll("selectedColumns");

        // Build filters
        const where: any = {};

        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                where.createdAt.gte = new Date(dateFrom);
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                where.createdAt.lte = toDate;
            }
        }

        if (status && status !== "all") {
            where.status = status;
        }

        // Get applications with related data
        const applications = await prisma.application.findMany({
            where,
            include: {
                User_Application_userIdToUser: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                ApplicationTraveller: {
                    include: {
                        Traveller: true,
                    },
                    orderBy: {
                        createdAt: 'asc' // Assume first traveller is primary
                    }
                },
                Payment: {
                    where: {
                        status: "COMPLETED",
                    },
                },
                User_Application_processedByIdToUser: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                Visa: {
                    include: {
                        Country: true,
                        VisaSubType: true,
                    },
                },
                VisaSubType: true,
                documents: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Helper to calculate days diff
        const daysDiff = (d1: Date, d2: Date) => {
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        // Helper to parse numeric SLA from string
        const parseSlaTarget = (processingTime: string | null): number | null => {
            if (!processingTime) return null;
            const match = processingTime.match(/(\d+)/);
            return match ? parseInt(match[0]) : null;
        };

        // Calculate summary
        const statusCounts: Record<string, number> = {};
        let paidCount = 0;
        let totalRevenue = 0;

        applications.forEach((app: any) => {
            statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
            if (app.Payment.length > 0) {
                paidCount++;
                totalRevenue += app.Payment.reduce((sum: number, p: any) => sum + p.amount, 0);
            }
        });

        const conversionRate = applications.length > 0
            ? (paidCount / applications.length) * 100
            : 0;

        // Data Transformation for Rows
        const transformedRows = applications.map((app: any, index: number) => {
            const primaryTraveller = app.ApplicationTraveller[0]?.Traveller;
            const nationality = primaryTraveller?.nationality || "N/A";
            const isIndian = nationality.toLowerCase() === "indian" || nationality.toLowerCase() === "india";
            const customerType = isIndian ? "Indian" : "Foreign";

            const isCompleted = ["APPROVED", "REJECTED", "COMPLETED"].includes(app.status);
            const completionDate = isCompleted ? app.updatedAt : null;

            const tat = completionDate ? daysDiff(new Date(app.createdAt), new Date(completionDate)) : null;
            const slaTargetDays = parseSlaTarget(app.Visa?.processingTime);

            let slaStatus = "Pending";
            if (isCompleted && tat !== null && slaTargetDays !== null) {
                slaStatus = tat <= slaTargetDays ? "Met" : "Breached";
            } else if (!isCompleted && slaTargetDays !== null) {
                const currentRun = daysDiff(new Date(app.createdAt), new Date());
                if (currentRun > slaTargetDays) slaStatus = "Breached (Ongoing)";
            }

            const totalPaid = app.Payment.reduce((sum: number, p: any) => sum + p.amount, 0);
            const discount = app.Payment.reduce((sum: number, p: any) => sum + (p.discountAmount || 0), 0);
            const grossAmount = totalPaid + discount;

            // Invoices not explicitly linked in a simple field in schema shown, using placeholder
            const invoiceNo = app.Payment[0]?.razorpayPaymentId || "-";

            return {
                "Sr No": index + 1,
                "Service Application ID": app.id,
                "Lead Date": app.createdAt.toISOString().split("T")[0],
                "Booking Date": app.createdAt.toISOString().split("T")[0],
                "Sales Persona": app.User_Application_processedByIdToUser?.name || "System",
                "Department": "Visa Services",
                "Product Category": "Visa",
                "Service Type": app.Visa?.category || "Tourist",
                "Sub Service": app.VisaSubType?.label || app.visaType || "Standard",
                "Customer Type (Indian / Foreign)": customerType,
                "Customer Name": app.User_Application_userIdToUser.name || "N/A",
                "Mobile No": app.User_Application_userIdToUser.phone || "N/A",
                "Email ID": app.User_Application_userIdToUser.email || "N/A",
                "Passport No (If Applicable)": primaryTraveller?.passportNumber || "-",
                "Nationality": nationality,
                "Service Country": app.Visa?.Country?.name || app.country || "N/A",
                "City / Location": "-", // Not in Application schema
                "Lead Source": "Website",
                "Processing Executive": app.User_Application_processedByIdToUser?.name || "Unassigned",
                "Vendor / Authority / Partner": "-",
                "Current Status": app.status,
                "Case Stage": app.status,
                "Documents Collected (Y/N)": app.documents.length > 0 ? "Y" : "N",
                "Missing Documents": "-",
                "Submission Date": "-",
                "Completion Date": completionDate ? completionDate.toISOString().split("T")[0] : "-",
                "TAT (Days)": tat !== null ? tat : "-",
                "SLA Target (Days)": slaTargetDays || "-",
                "SLA Status": slaStatus,
                "Invoice No": invoiceNo,
                "Invoice Date": app.Payment[0]?.createdAt.toISOString().split("T")[0] || "-",
                "Gross Amount": grossAmount,
                "Discount": discount,
                "Tax": 0, // Not separated
                "Net Amount": totalPaid,
                "Payment Status": app.Payment.length > 0 ? "Paid" : "Unpaid",
                "Payment Mode": app.Payment[0]?.method || "Online",
                "Remarks": app.notes || "-"
            };
        });

        // Export handling
        if (format === "xlsx" || format === "csv") {
            let exportData = transformedRows;
            if (selectedColumns.length > 0) {
                exportData = transformedRows.map((row: any) => {
                    const filteredRow: any = {};
                    selectedColumns.forEach((col) => {
                        if (row[col] !== undefined) {
                            filteredRow[col] = row[col];
                        }
                    });
                    return filteredRow;
                });
            }

            if (format === "xlsx") {
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Misc Services");
                const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
                return new NextResponse(buffer, {
                    headers: {
                        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "Content-Disposition": `attachment; filename=misc-services-${new Date().toISOString().split("T")[0]}.xlsx`,
                    },
                });
            } else {
                const csv = [
                    Object.keys(exportData[0] || {}).join(","),
                    ...exportData.map((row: any) =>
                        Object.values(row).map((v) => {
                            const str = String(v);
                            return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
                        }).join(",")
                    ),
                ].join("\n");
                return new NextResponse(csv, {
                    headers: {
                        "Content-Type": "text/csv",
                        "Content-Disposition": `attachment; filename=misc-services-${new Date().toISOString().split("T")[0]}.csv`,
                    },
                });
            }
        }

        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedRows = transformedRows.slice(start, end);

        return NextResponse.json({
            summary: {
                totalApplications: applications.length,
                paidApplications: paidCount,
                statusCounts,
                conversionRate,
                totalRevenue,
            },
            rows: paginatedRows,
            pagination: {
                page,
                limit,
                total: applications.length,
                totalPages: Math.ceil(applications.length / limit),
            },
            availableColumns: Object.keys(transformedRows[0] || {})
        });
    } catch (error) {
        console.error("Error fetching misc services report:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
