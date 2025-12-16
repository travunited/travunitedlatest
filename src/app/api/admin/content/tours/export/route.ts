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

    // Fetch all tours with related data
    const tours = await prisma.tour.findMany({
      include: {
        country: true,
        days: {
          orderBy: {
            dayIndex: "asc",
          },
        },
        addOns: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Prepare export data - flatten days and add-ons
    const exportData = tours.map((tour) => {
      // Combine tour days into a single string
      const daysText = tour.days
        .map((day) => `Day ${day.dayIndex}: ${day.title}\n${day.content}`)
        .join("\n\n");

      // Combine add-ons into a single string
      const addOnsText = tour.addOns
        .map((addon) => `${addon.name}${addon.description ? `: ${addon.description}` : ""} - ₹${addon.price / 100} (${addon.pricingType}, Required: ${addon.isRequired ? "Yes" : "No"})`)
        .join("\n");

      // Parse JSON fields safely
      const parseJsonField = (field: string | null): string => {
        if (!field) return "";
        try {
          const parsed = JSON.parse(field);
          if (Array.isArray(parsed)) {
            return parsed.join(", ");
          }
          return String(parsed);
        } catch {
          return field;
        }
      };

      return {
        ID: tour.id,
        Name: tour.name,
        Slug: tour.slug || "",
        Country: tour.country?.name || "",
        CountryCode: tour.country?.code || "",
        Subtitle: tour.subtitle || "",
        Destination: tour.destination,
        Duration: tour.duration,
        DurationDays: tour.durationDays || "",
        DurationNights: tour.durationNights || "",
        DestinationCountry: tour.destinationCountry || "",
        DestinationState: tour.destinationState || "",
        PrimaryDestination: tour.primaryDestination || "",
        Region: tour.region || "",
        CitiesCovered: parseJsonField(tour.citiesCovered),
        Overview: tour.overview || "",
        Description: tour.description || "",
        ShortDescription: tour.shortDescription || "",
        Price: tour.price,
        BasePriceInINR: tour.basePriceInInr || "",
        OriginalPrice: tour.originalPrice || "",
        Currency: tour.currency || "INR",
        PackageType: tour.packageType || "",
        TourType: tour.tourType || "",
        TourSubType: tour.tourSubType || "",
        Images: parseJsonField(tour.images),
        FeaturedImage: tour.featuredImage || "",
        ImageURL: tour.imageUrl || "",
        HeroImageURL: tour.heroImageUrl || "",
        GalleryImageURLs: tour.galleryImageUrls || "",
        Itinerary: parseJsonField(tour.itinerary),
        Inclusions: parseJsonField(tour.inclusions),
        Exclusions: parseJsonField(tour.exclusions),
        ImportantNotes: tour.importantNotes || "",
        DifficultyLevel: tour.difficultyLevel || "",
        GroupSizeMin: tour.groupSizeMin || "",
        GroupSizeMax: tour.groupSizeMax || "",
        MinimumTravelers: tour.minimumTravelers || "",
        MaximumTravelers: tour.maximumTravelers || "",
        AvailableDates: parseJsonField(tour.availableDates),
        BookingDeadline: tour.bookingDeadline ? new Date(tour.bookingDeadline).toISOString() : "",
        Status: tour.status || "",
        IsActive: tour.isActive ? "Yes" : "No",
        IsFeatured: tour.isFeatured ? "Yes" : "No",
        AllowAdvance: tour.allowAdvance ? "Yes" : "No",
        AdvancePercentage: tour.advancePercentage || "",
        RequiresPassport: tour.requiresPassport ? "Yes" : "No",
        RequiredDocuments: tour.requiredDocuments ? JSON.stringify(tour.requiredDocuments) : "",
        ChildPricingType: tour.childPricingType || "",
        ChildPricingValue: tour.childPricingValue || "",
        ChildAgeLimit: tour.childAgeLimit || "",
        HotelCategories: parseJsonField(tour.hotelCategories),
        CustomizationOptions: parseJsonField(tour.customizationOptions),
        SeasonalPricing: parseJsonField(tour.seasonalPricing),
        BookingPolicies: tour.bookingPolicies || "",
        CancellationTerms: tour.cancellationTerms || "",
        Highlights: parseJsonField(tour.highlights),
        BestFor: parseJsonField(tour.bestFor),
        RegionTags: parseJsonField(tour.regionTags),
        Themes: parseJsonField(tour.themes),
        MetaTitle: tour.metaTitle || "",
        MetaDescription: tour.metaDescription || "",
        MetaKeywords: tour.metaKeywords || "",
        CanonicalURL: tour.canonicalUrl || "",
        OGTitle: tour.ogTitle || "",
        OGDescription: tour.ogDescription || "",
        OGImage: tour.ogImage || "",
        TwitterTitle: tour.twitterTitle || "",
        TwitterDescription: tour.twitterDescription || "",
        TwitterImage: tour.twitterImage || "",
        TourDays: daysText || "",
        AddOns: addOnsText || "",
        CreatedAt: new Date(tour.createdAt).toISOString(),
        UpdatedAt: new Date(tour.updatedAt).toISOString(),
      };
    });

    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tours");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=tours-export-${new Date().toISOString().split("T")[0]}.xlsx`,
        },
      });
    } else {
      // CSV format
      if (exportData.length === 0) {
        // Return headers only
        const headers = Object.keys({
          ID: "",
          Name: "",
          Slug: "",
          Country: "",
          CountryCode: "",
          Subtitle: "",
          Destination: "",
          Duration: "",
          DurationDays: "",
          DurationNights: "",
          DestinationCountry: "",
          DestinationState: "",
          PrimaryDestination: "",
          Region: "",
          CitiesCovered: "",
          Overview: "",
          Description: "",
          ShortDescription: "",
          Price: "",
          BasePriceInINR: "",
          OriginalPrice: "",
          Currency: "",
          PackageType: "",
          TourType: "",
          TourSubType: "",
          Images: "",
          FeaturedImage: "",
          ImageURL: "",
          HeroImageURL: "",
          GalleryImageURLs: "",
          Itinerary: "",
          Inclusions: "",
          Exclusions: "",
          ImportantNotes: "",
          DifficultyLevel: "",
          GroupSizeMin: "",
          GroupSizeMax: "",
          MinimumTravelers: "",
          MaximumTravelers: "",
          AvailableDates: "",
          BookingDeadline: "",
          Status: "",
          IsActive: "",
          IsFeatured: "",
          AllowAdvance: "",
          AdvancePercentage: "",
          RequiresPassport: "",
          RequiredDocuments: "",
          ChildPricingType: "",
          ChildPricingValue: "",
          ChildAgeLimit: "",
          HotelCategories: "",
          CustomizationOptions: "",
          SeasonalPricing: "",
          BookingPolicies: "",
          CancellationTerms: "",
          Highlights: "",
          BestFor: "",
          RegionTags: "",
          Themes: "",
          MetaTitle: "",
          MetaDescription: "",
          MetaKeywords: "",
          CanonicalURL: "",
          OGTitle: "",
          OGDescription: "",
          OGImage: "",
          TwitterTitle: "",
          TwitterDescription: "",
          TwitterImage: "",
          TourDays: "",
          AddOns: "",
          CreatedAt: "",
          UpdatedAt: "",
        });
        const csvContent = headers.join(",");
        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=tours-export-${new Date().toISOString().split("T")[0]}.csv`,
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
          "Content-Disposition": `attachment; filename=tours-export-${new Date().toISOString().split("T")[0]}.csv`,
        },
      });
    }
  } catch (error) {
    console.error("Error exporting tours:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
