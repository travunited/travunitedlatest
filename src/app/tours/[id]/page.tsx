import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TourRedirectPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
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
          { status: null },
        ],
      },
      select: { slug: true },
    });

    if (tour?.slug) {
      // Redirect to the holidays route with the correct slug
      redirect(`/holidays/${encodeURIComponent(tour.slug)}`);
    } else {
      // If tour not found, redirect to holidays listing
      redirect("/holidays");
    }
  } catch (error) {
    console.error("Error in tour redirect:", error);
    // On error, redirect to holidays listing
    redirect("/holidays");
  }
}

