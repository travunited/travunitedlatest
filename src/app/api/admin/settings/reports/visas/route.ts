import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



export async function GET(req: Request) {
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
    const format = searchParams.get("format"); // csv or json

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

    // Fetch all applications with related data
    const applications = await prisma.application.findMany({
      where,
      include: {
        User_Application_userIdToUser: true,
        Visa: {
          include: {
            Country: true,
          },
        },
        VisaSubType: true,
        ApplicationTraveller: {
          include: {
            Traveller: true,
          },
          take: 1,
        },
        Payment: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "csv") {
      // Generate CSV with requested columns
      let csv = "Application ID,Lead Date,Custom Type,Customer Name,Mobile Number,Email ID,Passport Number,Nationality,Visa Country,Visa Category,Visa Sub Type,Entry Type,Payment Mode\n";

      applications.forEach((app) => {
        const user = app.User_Application_userIdToUser;
        const visa = app.Visa;
        const visaSubType = app.VisaSubType;
        const traveller = app.ApplicationTraveller[0]?.Traveller;
        const payment = app.Payment[0];

        const applicationId = app.id || "";
        const leadDate = app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "";
        const customType = app.visaType || visa?.category || "";
        const customerName = user?.name || "";
        const mobileNumber = user?.phone || "";
        const emailId = user?.email || "";
        const passportNumber = traveller?.passportNumber || "";
        const nationality = app.country || "";
        const visaCountry = visa?.Country?.name || app.country || "";
        const visaCategory = visa?.category || "";
        const visaSubTypeLabel = visaSubType?.label || "";
        const entryType = visa?.entryType || visa?.entryTypeLegacy || "";
        const paymentMode = payment?.method || "";

        // Escape CSV values
        const escapeCsv = (val: string) => {
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        };

        csv += `${escapeCsv(applicationId)},${escapeCsv(leadDate)},${escapeCsv(customType)},${escapeCsv(customerName)},${escapeCsv(mobileNumber)},${escapeCsv(emailId)},${escapeCsv(passportNumber)},${escapeCsv(nationality)},${escapeCsv(visaCountry)},${escapeCsv(visaCategory)},${escapeCsv(visaSubTypeLabel)},${escapeCsv(entryType)},${escapeCsv(paymentMode)}\n`;
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="visa-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Return JSON format with application details
    const report = applications.map((app) => {
      const user = app.User_Application_userIdToUser;
      const visa = app.Visa;
      const visaSubType = app.VisaSubType;
      const traveller = app.ApplicationTraveller[0]?.Traveller;
      const payment = app.Payment[0];

      return {
        applicationId: app.id,
        leadDate: app.createdAt,
        customType: app.visaType || visa?.category || "",
        customerName: user?.name || "",
        mobileNumber: user?.phone || "",
        emailId: user?.email || "",
        passportNumber: traveller?.passportNumber || "",
        nationality: app.country || "",
        visaCountry: visa?.Country?.name || app.country || "",
        visaCategory: visa?.category || "",
        visaSubType: visaSubType?.label || "",
        entryType: visa?.entryType || visa?.entryTypeLegacy || "",
        paymentMode: payment?.method || "",
      };
    });

    return NextResponse.json({ applications: report });
  } catch (error) {
    console.error("Error generating visa report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

