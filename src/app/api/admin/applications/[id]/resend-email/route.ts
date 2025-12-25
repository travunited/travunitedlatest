import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendVisaStatusUpdateEmail,
  sendVisaDocumentRejectedEmail,
  sendVisaApprovedEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
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
    const { emailType } = body;

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        User_Application_userIdToUser: {
          select: {
            email: true,
            role: true,
          },
        },
        ApplicationDocument: {
          where: {
            status: "REJECTED",
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Send appropriate email based on type
    let emailSent = false;
    let emailError: Error | null = null;

    try {
      switch (emailType) {
        case "application_submitted":
          emailSent = await sendVisaStatusUpdateEmail(
            application.User_Application_userIdToUser.email,
            application.id,
            application.country || "",
            application.visaType || "",
            "SUBMITTED",
            application.User_Application_userIdToUser.role || "CUSTOMER"
          );
          break;

        case "docs_rejected":
          const rejectedDocs = application.ApplicationDocument.map(doc => ({
            type: doc.documentType || "Document",
            reason: doc.rejectionReason || "Document does not meet requirements",
          }));
          emailSent = await sendVisaDocumentRejectedEmail(
            application.User_Application_userIdToUser.email,
            application.id,
            application.country || "",
            application.visaType || "",
            rejectedDocs,
            application.User_Application_userIdToUser.role || "CUSTOMER"
          );
          break;

        case "visa_approved":
          emailSent = await sendVisaApprovedEmail(
            application.User_Application_userIdToUser.email,
            application.id,
            application.country || "",
            application.visaType || "",
            application.User_Application_userIdToUser.role || "CUSTOMER"
          );
          break;

        case "status_update":
          emailSent = await sendVisaStatusUpdateEmail(
            application.User_Application_userIdToUser.email,
            application.id,
            application.country || "",
            application.visaType || "",
            application.status,
            application.User_Application_userIdToUser.role || "CUSTOMER"
          );
          break;

        default:
          return NextResponse.json(
            { error: "Invalid email type" },
            { status: 400 }
          );
      }

      if (!emailSent) {
        return NextResponse.json(
          { error: "Failed to send email. Check email configuration and try again." },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: "Email sent successfully" });
    } catch (error) {
      emailError = error instanceof Error ? error : new Error(String(error));
      console.error("Error sending email:", emailError);
      return NextResponse.json(
        {
          error: "Failed to send email",
          message: emailError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error resending email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

