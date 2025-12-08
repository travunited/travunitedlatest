import { prisma } from "@/lib/prisma";

/**
 * Promote scheduled blog posts whose publishedAt is now due.
 * Returns the number of posts updated.
 */
export async function publishReadyPosts(now: Date = new Date()): Promise<number> {
  const result = await prisma.blogPost.updateMany({
    where: {
      isPublished: false,
      publishedAt: {
        lte: now,
      },
    },
    data: {
      isPublished: true,
    },
  });

  return result.count;
}

