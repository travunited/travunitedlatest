import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markAllNotificationsAsRead, getNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Get notifications for the current user with filters and pagination
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") as "all" | "visa" | "tour" | "payment" | "system" | null;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await getNotifications(session.user.id, {
      filter: filter || "all",
      unreadOnly,
      page,
      limit,
    });

    return NextResponse.json({
      notifications: result.notifications,
      pagination: result.pagination,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for the current user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action;

    if (action === "read-all") {
      const count = await markAllNotificationsAsRead(session.user.id);
      return NextResponse.json({ message: "All notifications marked as read", count });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

