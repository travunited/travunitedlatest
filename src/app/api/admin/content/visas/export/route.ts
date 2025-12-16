import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "@e965/xlsx";

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

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx"; // xlsx or csv

    // Fetch all visas with related data
    const visas = await prisma.visa.findMany({
      include: {
        country: true,
        faqs: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        requirements: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        subTypes: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Prepare export data - flatten FAQs, requirements, and subtypes
    const exportData = visas.map((visa) => {
      // Combine FAQs into a single string
      const faqsText = visa.faqs
        .map((faq, idx) => `Q${idx + 1}: ${faq.question}\nA${idx + 1}: ${faq.answer}`)
        .join("\n\n");

      // Combine requirements into a single string
      const requirementsText = visa.requirements
        .map((req) => `${req.name}${req.description ? `: ${req.description}` : ""} (${req.scope}, Required: ${req.isRequired ? "Yes" : "No"})`)
        .join("\n");

      // Combine subtypes into a single string
      const subtypesText = visa.subTypes.map((st) => st.label).join(", ");

      return {
        ID: visa.id,
        Name: visa.name,
        Slug: visa.slug,
        Country: visa.country.name,
        CountryCode: visa.country.code,
        Subtitle: visa.subtitle || "",
        Category: visa.category,
        IsActive: visa.isActive ? "Yes" : "No",
        IsFeatured: visa.isFeatured ? "Yes" : "No",
        PriceInINR: visa.priceInInr,
        GovernmentFee: visa.govtFee || "",
        ServiceFee: visa.serviceFee || "",
        Currency: visa.currency || "INR",
        ProcessingTime: visa.processingTime,
        StayDuration: visa.stayDuration || "",
        StayDurationDays: visa.stayDurationDays || "",
        Validity: visa.validity || "",
        ValidityDays: visa.validityDays || "",
        EntryTypeLegacy: visa.entryTypeLegacy || "",
        EntryType: visa.entryType || "",
        StayType: visa.stayType || "",
        VisaMode: visa.visaMode || "",
        VisaSubTypeLabel: visa.visaSubTypeLabel || "",
        Overview: visa.overview || "",
        Eligibility: visa.eligibility || "",
        ImportantNotes: visa.importantNotes || "",
        RejectionReasons: visa.rejectionReasons || "",
        WhyTravunited: visa.whyTravunited || "",
        Statistics: visa.statistics || "",
        HeroImageURL: visa.heroImageUrl || "",
        SampleVisaImageURL: visa.sampleVisaImageUrl || "",
        MetaTitle: visa.metaTitle || "",
        MetaDescription: visa.metaDescription || "",
        FAQs: faqsText || "",
        Requirements: requirementsText || "",
        SubTypes: subtypesText || "",
        CreatedAt: new Date(visa.createdAt).toISOString(),
        UpdatedAt: new Date(visa.updatedAt).toISOString(),
      };
    });

    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Visas");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=visas-export-${new Date().toISOString().split("T")[0]}.xlsx`,
        },
      });
    } else {
      // CSV format
      if (exportData.length === 0) {
        const headers = Object.keys({
          ID: "",
          Name: "",
          Slug: "",
          Country: "",
          CountryCode: "",
          Subtitle: "",
          Category: "",
          IsActive: "",
          IsFeatured: "",
          PriceInINR: "",
          GovernmentFee: "",
          ServiceFee: "",
          Currency: "",
          ProcessingTime: "",
          StayDuration: "",
          StayDurationDays: "",
          Validity: "",
          ValidityDays: "",
          EntryTypeLegacy: "",
          EntryType: "",
          StayType: "",
          VisaMode: "",
          VisaSubTypeLabel: "",
          Overview: "",
          Eligibility: "",
          ImportantNotes: "",
          RejectionReasons: "",
          WhyTravunited: "",
          Statistics: "",
          HeroImageURL: "",
          SampleVisaImageURL: "",
          MetaTitle: "",
          MetaDescription: "",
          FAQs: "",
          Requirements: "",
          SubTypes: "",
          CreatedAt: "",
          UpdatedAt: "",
        });
        const csvContent = headers.join(",");
        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=visas-export-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }

      const headers = Object.keys(exportData[0]);
      const rows = exportData.map((row) =>
        headers.map((header) => {
          const value = row[header as keyof typeof row];
          const stringValue = String(value || "");
          // Escape commas and quotes
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
      );

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=visas-export-${new Date().toISOString().split("T")[0]}.csv`,
        },
      });
    }
  } catch (error) {
    console.error("Error exporting visas:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

