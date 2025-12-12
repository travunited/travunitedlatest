import { prisma } from "@/lib/prisma";

/**
 * Promote scheduled blog posts whose publishedAt is now due.
 * Returns the number of posts updated.
 * 
 * This function should be called:
 * - When users visit blog pages (to ensure posts are published on time)
 * - Via cron job at regular intervals (e.g., every 5-15 minutes) for reliability
 */
export async function publishReadyPosts(now: Date = new Date()): Promise<number> {
  try {
    // Ensure publishedAt is not null and is in the past or equal to now
    const result = await prisma.blogPost.updateMany({
      where: {
        isPublished: false,
        publishedAt: {
          not: null,
          lte: now,
        },
      },
      data: {
        isPublished: true,
      },
    });

    if (result.count > 0) {
      console.log(`[publishReadyPosts] Published ${result.count} scheduled blog post(s) at ${now.toISOString()}`);
    }

    return result.count;
  } catch (error) {
    console.error("[publishReadyPosts] Error publishing scheduled posts:", error);
    throw error;
  }
}

