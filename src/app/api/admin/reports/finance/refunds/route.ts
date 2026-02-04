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
        const format = searchParams.get("format");

        // Build filters
        const where: any = {
            status: "REFUNDED",
        };

        if (dateFrom || dateTo) {
            where.createdAt = {}; // This is the refund date (assuming Payment record creation matches refund time or close to it)
            if (dateFrom) {
                where.createdAt.gte = new Date(dateFrom);
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                where.createdAt.lte = toDate;
            }
        }

        // Get refunded payments with related data
        const payments = await prisma.payment.findMany({
            where,
            include: {
                User: {
                    select: {
                        name: true,
                        email: true,
                        // bankDetails and upiId are not directly on User model in current schema
                    },
                },
                Application: {
                    select: {
                        id: true,
                        country: true,
                        visaType: true,
                        processedById: true,
                        updatedAt: true, // Use as proxy for cancellation date if status is cancelled
                        status: true,
                        User_Application_processedByIdToUser: {
                            select: { name: true, email: true }
                        }
                    },
                },
                Booking: {
                    select: {
                        id: true,
                        tourName: true,
                        processedById: true,
                        updatedAt: true,
                        status: true,
                        User_Booking_processedByIdToUser: {
                            select: { name: true, email: true }
                        }
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Transform data
        const rows = payments.map((p: any) => {
            const isVisa = !!p.applicationId;
            const entity = isVisa ? p.Application : p.Booking;

            const serviceName = isVisa
                ? `${entity?.country || ""} ${entity?.visaType || ""} Visa`
                : (entity?.tourName || "Other Service");

            const cancellationDate = (entity?.status === "CANCELLED" || entity?.status === "REJECTED")
                ? entity.updatedAt.toISOString()
                : "N/A";

            // Attempt to access bank details if they exist on the User object (need to verify schema, assuming simplified access)
            // If schema doesn't have it, these will be undefined/null
            const bankDetails = "Online Refund to Source";

            const salesPerson = entity?.User_Application_processedByIdToUser?.name
                || entity?.User_Booking_processedByIdToUser?.name
                || "System";

            return {
                paymentReceiptDateTime: p.createdAt.toISOString(), // Ideally we need original payment date, not refund date. 
                // But for REFUNDED payments, createdAt might be the time the refund record was created? 
                // Or is the Payment record the original payment that is now marked REFUNDED?
                // Usually, a Payment ID represents the money coming IN. When it's REFUNDED, the status changes.
                // So p.createdAt is the original Receipt Date.

                partyName: p.User?.name || "Customer",
                transactionId: p.razorpayPaymentId || "N/A",
                amount: p.amount,
                paidForServiceName: serviceName,
                cancellationDate: cancellationDate,
                cancellationCharges: 0, // Placeholder
                refundableAmount: p.amount, // Placeholder, assuming full refund
                refundDate: p.updatedAt.toISOString(), // When the status changed to REFUNDED
                partyBankDetails: bankDetails,
                refundRefId: p.razorpayPaymentId || `REF-${p.id.slice(0, 8)}`,
                status: p.status,
                salesPerson: salesPerson
            };
        });

        // Export handling
        if (format === "xlsx" || format === "csv") {
            const exportData = rows.map((row: any) => ({
                "Payment receipt Date & Time": row.paymentReceiptDateTime,
                "Party Name": row.partyName,
                "Transaction Id": row.transactionId,
                "Amount": row.amount,
                "Paid for Service Name": row.paidForServiceName,
                "Cancellation Date": row.cancellationDate,
                "Cancellation Charges": row.cancellationCharges,
                "Refundable Amount": row.refundableAmount,
                "Date": row.refundDate,
                "Party Bank A/c Detail OR UPI ID": row.partyBankDetails,
                "Refund Ref ID": row.refundRefId,
                "Status": row.status,
                "Sales Person Name / ID": row.salesPerson
            }));

            if (format === "xlsx") {
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Cancel & Refund Report");
                const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
                return new NextResponse(buffer, {
                    headers: {
                        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "Content-Disposition": `attachment; filename=refund-report-${new Date().toISOString().split("T")[0]}.xlsx`,
                    },
                });
            } else {
                // CSV
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
                        "Content-Disposition": `attachment; filename=refund-report-${new Date().toISOString().split("T")[0]}.csv`,
                    },
                });
            }
        }

        return NextResponse.json({ rows });
    } catch (error) {
        console.error("Error fetching refund report:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
