import { Hero } from "@/components/home/Hero";
import { FeaturedVisas } from "@/components/home/FeaturedVisas";
import { FeaturedTours } from "@/components/home/FeaturedTours";
import { WhyTravunited } from "@/components/home/WhyTravunited";
import { Testimonials } from "@/components/home/Testimonials";
import { BlogHighlights } from "@/components/home/BlogHighlights";
import { prisma } from "@/lib/prisma";
import { getMediaProxyUrl } from "@/lib/media";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  // Fetch featured visas (max 6) with error handling
  let featuredVisas: any[] = [];
  try {
    featuredVisas = await prisma.visa.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      include: {
        Country: {
          select: {
            id: true,
            name: true,
            code: true,
            flagUrl: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 6,
    });
  } catch (error) {
    console.error("Error fetching featured visas:", error);
    // Continue with empty array
  }

  // Fetch featured tours (max 8) with error handling
  let featuredTours: any[] = [];
  try {
    featuredTours = await prisma.tour.findMany({
      where: {
        isActive: true,
        isFeatured: true,
        status: "active",
      },
      include: {
        Country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    });
  } catch (error) {
    console.error("Error fetching featured tours:", error);
    // Continue with empty array
  }

  // Fetch featured blogs (prefer featured, fallback to latest) with error handling
  let featuredBlogs: Prisma.BlogPostGetPayload<{}>[] = [];
  try {
    // First, publish any scheduled posts that are ready (runs before fetching)
    try {
      const { publishReadyPosts } = await import("@/lib/blog/publishReady");
      await publishReadyPosts();
    } catch (publishError) {
      console.error("Error auto-publishing scheduled blog posts:", publishError);
      // Continue even if publish fails - don't block page rendering
    }

    // Fetch only published posts (scheduled posts are now promoted)
    featuredBlogs = await prisma.blogPost.findMany({
      where: {
        isPublished: true,
      },
      orderBy: [
        { isFeatured: "desc" }, // Featured first
        { publishedAt: "desc" }, // Then by publish date
      ],
      take: 3,
    });
  } catch (error) {
    console.error("Error fetching featured blogs:", error);
    // Continue with empty array
  }

  // Transform visas data for component
  const visaCards = featuredVisas.map((visa) => {
    // Ensure all values are primitives, not objects
    // Safely handle category - ensure it's always a string or null
    let category: string | null = null;
    if (visa.category) {
      if (typeof visa.category === 'string') {
        category = visa.category;
      } else if (typeof visa.category === 'object') {
        // If category is an object, don't include it (set to null)
        category = null;
      } else {
        category = String(visa.category);
      }
    }

    return {
      id: String(visa.id || ''),
      slug: String(visa.slug || ''),
      name: String(visa.name || ''),
      subtitle: visa.subtitle ? String(visa.subtitle) : null,
      country: String((visa as any).Country?.name || ''),
      countryCode: String((visa as any).Country?.code?.toLowerCase() || ''),
      price: Number(visa.priceInInr || 0),
      processingTime: String(visa.processingTime || ''),
      entryType: visa.entryType ? String(visa.entryType) : null,
      entryTypeLegacy: visa.entryTypeLegacy ? String(visa.entryTypeLegacy) : null,
      stayType: visa.stayType ? String(visa.stayType) : null,
      visaSubTypeLabel: visa.visaSubTypeLabel ? String(visa.visaSubTypeLabel) : null,
      category, // Include category as string or null
      // Use hero image for cards; do not fall back to sample to avoid thumbnailing
      image: getMediaProxyUrl(visa.heroImageUrl) || null,
    };
  });

  // Transform tours data for component
  const tourCards = featuredTours.map((tour) => {
    // Ensure all values are primitives, not objects
    return {
      id: String(tour.id || ''),
      slug: String(tour.slug || tour.id || ''),
      name: String(tour.name || ''),
      subtitle: tour.subtitle ? String(tour.subtitle) : null,
      destination: String(tour.destinationCountry || tour.destination || ''),
      duration: tour.durationDays
        ? `${tour.durationDays} ${tour.durationDays === 1 ? "Day" : "Days"}`
        : String(tour.duration || ''),
      durationNights: tour.durationNights ? Number(tour.durationNights) : null,
      price: Number(tour.price || tour.basePriceInInr || 0),
      image: getMediaProxyUrl(tour.heroImageUrl || tour.featuredImage || tour.imageUrl) || null,
    };
  });

  // Transform blogs data for component
  const blogCards = featuredBlogs.map((post) => {
    // Safely convert category to string, handling objects and null/undefined
    let category: string | null = null;
    if (post.category) {
      if (typeof post.category === 'string') {
        category = post.category;
      } else if (typeof post.category === 'object') {
        // If category is an object, extract a meaningful string or use null
        category = null; // Don't render objects
      } else {
        category = String(post.category);
      }
    }

    return {
      id: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      image: getMediaProxyUrl(post.coverImage),
      date: (post.publishedAt ?? post.createdAt).toISOString(),
      category,
    };
  });

  // Ensure arrays are valid and filter out any invalid entries
  const safeVisaCards = Array.isArray(visaCards)
    ? visaCards.filter((card) => card && typeof card === 'object' && typeof card.id === 'string' && typeof card.name === 'string')
    : [];
  const safeTourCards = Array.isArray(tourCards)
    ? tourCards.filter((card) => card && typeof card === 'object' && typeof card.id === 'string' && typeof card.name === 'string')
    : [];
  const safeBlogCards = Array.isArray(blogCards)
    ? blogCards.filter((card) => card && typeof card === 'object' && typeof card.id === 'string' && typeof card.title === 'string')
    : [];

  return (
    <div className="flex flex-col">
      <Hero />
      {safeVisaCards.length > 0 && <FeaturedVisas visas={safeVisaCards} />}
      {safeTourCards.length > 0 && <FeaturedTours tours={safeTourCards} />}
      <WhyTravunited />
      <Testimonials />
      {safeBlogCards.length > 0 && <BlogHighlights posts={safeBlogCards} />}
    </div>
  );
}

