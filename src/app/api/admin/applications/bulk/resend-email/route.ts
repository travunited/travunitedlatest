import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVisaStatusUpdateEmail } from "@/lib/email";
export const dynamic = "force-dynamic";



export async function POST(req: Request) {
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

    const body = await req.json();
    const { applicationIds } = body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { error: "No applications provided" },
        { status: 400 }
      );
    }

    // Get applications with user emails
    const applications = await prisma.application.findMany({
      where: {
        id: {
          in: applicationIds,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    // Send status update emails
    for (const app of applications) {
      try {
        await sendVisaStatusUpdateEmail(
          app.user.email,
          app.id,
          app.country || "",
          app.visaType || "",
          app.status,
          app.user.role || "CUSTOMER"
        );
      } catch (error) {
        console.error(`Error sending email for application ${app.id}:`, error);
      }
    }

    return NextResponse.json({ message: "Emails sent successfully" });
  } catch (error) {
    console.error("Error resending emails:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

