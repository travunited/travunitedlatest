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
  let featuredVisas: Prisma.VisaGetPayload<{
    include: { country: { select: { id: true; name: true; code: true; flagUrl: true } } };
  }>[] = [];
  try {
    featuredVisas = await prisma.visa.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      include: {
        country: {
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

  // Fetch featured tours (max 6) with error handling
  let featuredTours: Prisma.TourGetPayload<{
    include: { country: { select: { id: true; name: true; code: true } } };
  }>[] = [];
  try {
    featuredTours = await prisma.tour.findMany({
      where: {
        isActive: true,
        isFeatured: true,
        status: "active",
      },
      include: {
        country: {
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
      take: 6,
    });
  } catch (error) {
    console.error("Error fetching featured tours:", error);
    // Continue with empty array
  }

  // Fetch featured blogs (prefer featured, fallback to latest) with error handling
  let featuredBlogs: Prisma.BlogPostGetPayload<{}>[] = [];
  try {
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
  const visaCards = featuredVisas.map((visa) => ({
    id: visa.id,
    slug: visa.slug,
    name: visa.name,
    subtitle: visa.subtitle,
    country: visa.country.name,
    countryCode: visa.country.code.toLowerCase(),
    price: visa.priceInInr,
    processingTime: visa.processingTime,
    entryType: visa.entryType,
    entryTypeLegacy: visa.entryTypeLegacy,
    stayType: visa.stayType,
    visaSubTypeLabel: visa.visaSubTypeLabel,
    image: getMediaProxyUrl(visa.sampleVisaImageUrl || visa.heroImageUrl),
  }));

  // Transform tours data for component
  const tourCards = featuredTours.map((tour) => ({
    id: tour.id,
    slug: tour.slug || tour.id,
    name: tour.name,
    subtitle: tour.subtitle,
    destination: tour.destinationCountry || tour.destination,
    duration: tour.durationDays
      ? `${tour.durationDays} ${tour.durationDays === 1 ? "Day" : "Days"}`
      : tour.duration,
    durationNights: tour.durationNights,
    price: tour.price || tour.basePriceInInr || 0,
    image: getMediaProxyUrl(tour.heroImageUrl || tour.featuredImage || tour.imageUrl),
  }));

  // Transform blogs data for component
  const blogCards = featuredBlogs.map((post) => ({
    id: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    image: getMediaProxyUrl(post.coverImage),
    date: (post.publishedAt ?? post.createdAt).toISOString(),
    category: post.category,
  }));

  return (
    <div className="flex flex-col">
      <Hero />
      {visaCards.length > 0 && <FeaturedVisas visas={visaCards} />}
      {tourCards.length > 0 && <FeaturedTours tours={tourCards} />}
      <WhyTravunited />
      <Testimonials />
      {blogCards.length > 0 && <BlogHighlights posts={blogCards} />}
    </div>
  );
}

