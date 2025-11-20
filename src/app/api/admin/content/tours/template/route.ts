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
      "title",
      "slug",
      "description",
      "short_description",
      "price",
      "original_price",
      "currency",
      "duration_days",
      "duration_nights",
      "destination_country",
      "cities_covered",
      "images",
      "featured_image",
      "inclusions",
      "exclusions",
      "itinerary",
      "difficulty_level",
      "group_size_min",
      "group_size_max",
      "available_dates",
      "booking_deadline",
      "status",
      "featured",
      "category_id",
      "meta_title",
      "meta_description",
      "meta_keywords",
      "canonical_url",
      "og_title",
      "og_description",
      "og_image",
      "created_at",
      "updated_at",
      "country_id",
      "package_type",
      "minimum_travelers",
      "maximum_travelers",
      "hotel_categories",
      "customization_options",
      "seasonal_pricing",
      "booking_policies",
      "cancellation_terms",
      "highlights",
      "best_for",
      "destination_state",
      "twitter_title",
      "twitter_description",
      "twitter_image",
      "tour_type",
      "tour_sub_type",
      "region",
      "primary_destination",
      "region_tags",
      "themes"
    ];

    const exampleRows = [
      {
        id: "",
        title: "Exotic Andaman 4 Nights 5 Days",
        slug: "exotic-andaman-4-nights-5-days",
        description: "The Andaman Islands offer a perfect blend of turquoise waters, white sandy beaches, lush greenery, and rich history.",
        short_description: "",
        price: "39999",
        original_price: "",
        currency: "INR",
        duration_days: "5",
        duration_nights: "4",
        destination_country: "Australia",
        cities_covered: "[]",
        images: "[\"https://example.com/image1.jpg\"]",
        featured_image: "",
        inclusions: "[\"4 Nights hotel accommodation with breakfast.\", \"Airport transfers.\"]",
        exclusions: "[\"Airfare / Train tickets\", \"Lunch and dinner.\"]",
        itinerary: "[]",
        difficulty_level: "Easy",
        group_size_min: "1",
        group_size_max: "10",
        available_dates: "[]",
        booking_deadline: "",
        status: "active",
        featured: "TRUE",
        category_id: "",
        meta_title: "",
        meta_description: "",
        meta_keywords: "",
        canonical_url: "",
        og_title: "",
        og_description: "",
        og_image: "",
        created_at: "",
        updated_at: "",
        country_id: "",
        package_type: "standard",
        minimum_travelers: "1",
        maximum_travelers: "50",
        hotel_categories: "[]",
        customization_options: "{}",
        seasonal_pricing: "{}",
        booking_policies: "",
        cancellation_terms: "",
        highlights: "[]",
        best_for: "[]",
        destination_state: "",
        twitter_title: "",
        twitter_description: "",
        twitter_image: "",
        tour_type: "international",
        tour_sub_type: "",
        region: "",
        primary_destination: "",
        region_tags: "[]",
        themes: "[]"
      }
    ];

    if (format === "xlsx") {
      const buffer = generateXLSXTemplate(headers, exampleRows);
      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=tours-template.xlsx",
        },
      });
    } else {
      const csv = generateCSVTemplate(headers, exampleRows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=tours-template.csv",
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

