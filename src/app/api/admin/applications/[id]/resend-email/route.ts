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
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        documents: {
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
    switch (emailType) {
      case "application_submitted":
        await sendVisaStatusUpdateEmail(
          application.user.email,
          application.id,
          application.country || "",
          application.visaType || "",
          "SUBMITTED",
          application.user.role || "CUSTOMER"
        );
        break;

      case "docs_rejected":
        const rejectedDocs = application.documents.map(doc => ({
          type: doc.documentType || "Document",
          reason: doc.rejectionReason || "Document does not meet requirements",
        }));
        await sendVisaDocumentRejectedEmail(
          application.user.email,
          application.id,
          application.country || "",
          application.visaType || "",
          rejectedDocs,
          application.user.role || "CUSTOMER"
        );
        break;

      case "visa_approved":
        await sendVisaApprovedEmail(
          application.user.email,
          application.id,
          application.country || "",
          application.visaType || "",
          application.user.role || "CUSTOMER"
        );
        break;

      case "status_update":
        await sendVisaStatusUpdateEmail(
          application.user.email,
          application.id,
          application.country || "",
          application.visaType || "",
          application.status,
          application.user.role || "CUSTOMER"
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error resending email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

