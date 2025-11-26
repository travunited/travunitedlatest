import { Star, Quote } from "lucide-react";
import { TestimonialsClient } from "./TestimonialsClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds

interface HomepageReview {
  id: string;
  reviewerName: string | null;
  title: string | null;
  comment: string;
  rating: number;
  imageKey: string | null;
  imageUrl: string | null;
  link: string | null;
}

export async function Testimonials() {
  // Fetch featured homepage reviews
  let reviews: HomepageReview[] = [];
  try {
    reviews = await prisma.review.findMany({
      where: {
        userId: null, // Homepage reviews don't have userId
        isFeatured: true,
        isVisible: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6, // Limit to 6 reviews
      select: {
        id: true,
        reviewerName: true,
        title: true,
        comment: true,
        rating: true,
        imageKey: true,
        imageUrl: true,
        link: true,
      },
    });
  } catch (error) {
    console.error("Error fetching homepage reviews:", error);
    // Fallback to empty array if fetch fails
    reviews = [];
  }

  return <TestimonialsClient reviews={reviews} />;
}

