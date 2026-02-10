import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TourRedirectPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  let destination = "/holidays";

  try {
    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const slug = decodeURIComponent(resolvedParams.id);

    // Try to find the tour to ensure it exists and get the correct slug
    const tour = await prisma.tour.findFirst({
      where: {
        slug: slug,
        OR: [
          { isActive: true },
          { status: "active" },
          { status: null }, // Handle legacy null status
        ],
      },
      select: { slug: true },
    });

    if (tour?.slug) {
      destination = `/holidays/${encodeURIComponent(tour.slug)}`;
    }
  } catch (error) {
    console.error("Error in tour redirect logic:", error);
    // On error, we'll fall back to default destination "/holidays"
  }

  // Redirect outside try-catch to allow NEXT_REDIRECT to work
  redirect(destination);
}

