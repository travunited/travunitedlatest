import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publishReadyPosts } from "@/lib/blog/publishReady";

export const dynamic = "force-dynamic";

function isCronAuthorized(req: Request) {
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const envSecret = process.env.CRON_SECRET_BLOG || process.env.CRON_SECRET;
  return !!envSecret && headerSecret === envSecret;
}

export async function POST(req: Request) {
  try {
    // Allow either authenticated admin or a cron secret header
    const session = await getServerSession(authOptions);
    const isAdmin =
      session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
    const cronAllowed = isCronAuthorized(req);

    if (!isAdmin && !cronAllowed) {
      return NextResponse.json(
        { error: "Forbidden - Admin access or valid cron secret required" },
        { status: 403 }
      );
    }

    const promotedCount = await publishReadyPosts();

    return NextResponse.json({
      message: "Published ready blog posts",
      promoted: promotedCount,
      via: cronAllowed ? "cron" : "admin",
    });
  } catch (error) {
    console.error("Error publishing ready blog posts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

