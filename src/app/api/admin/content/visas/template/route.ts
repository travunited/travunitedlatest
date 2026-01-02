import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateCSVTemplate, generateXLSXTemplate } from "@/lib/import-utils";

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
    const format = searchParams.get("format") || "csv";

    const headers = [
      "id",
      "name",
      "slug",
      "visa_type",
      "duration",
      "price",
      "image",
      "description",
      "processing_time",
      "requirements",
      "created_at",
      "updated_at",
      "document_requirements",
      "visa_sample_image",
      "content_sections",
      "faqs",
      "subtypes",
      "flag_emoji",
      "visa_types",
      "meta_title",
      "meta_description",
      "meta_keywords",
      "canonical_url",
      "og_title",
      "og_description",
      "og_image",
      "structured_data"
    ];

    const exampleRows = [
      {
        id: "",
        name: "Turkey",
        slug: "turkey",
        visa_type: "Single Entry E Visa Short Stay",
        duration: "30 Days",
        price: "5500",
        image: "https://images.pexels.com/photos/2048865/pexels-photo-2048865.jpeg?auto=compress&cs=tinysrgb&w=800",
        description: "Turkey is where East meets West in a breathtaking blend of ancient ruins, vibrant bazaars, and stunning landscapes",
        processing_time: "1 to 2 Working Days",
        requirements: '["Passport copy", "Recent photo", "One among -UK,US,Ireland Or Schengen Passport"]',
        created_at: "",
        updated_at: "",
        document_requirements: '[{"id": "doc-1", "name": "Passport copy", "description": "Required document"}]',
        visa_sample_image: "",
        content_sections: '[{"id": "1", "title": "Eligibility for eVisa", "description": "Must hold a valid visa or residence permit"}]',
        faqs: '[{"id": "1", "question": "Is a transit visa required?", "answer": "No, if you stay in the international transit area"}]',
        subtypes: '["Single Entry eVisa", "Multiple Entry eVisa"]',
        flag_emoji: "🇹🇷",
        visa_types: "[]",
        meta_title: "Turkey Visa - Apply Online | Travunited",
        meta_description: "Apply for Turkey Single Entry E Visa Short Stay online - Starting from ₹5500 INR",
        meta_keywords: "",
        canonical_url: "",
        og_title: "",
        og_description: "",
        og_image: "",
        structured_data: "{}"
      }
    ];

    if (format === "xlsx") {
      const buffer = generateXLSXTemplate(headers, exampleRows);
      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=visas-template.xlsx",
        },
      });
    } else {
      const csv = generateCSVTemplate(headers, exampleRows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=visas-template.csv",
        },
      });
    }
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

