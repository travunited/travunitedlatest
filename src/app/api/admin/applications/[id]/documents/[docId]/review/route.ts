import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVisaDocumentRejectedEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
export const dynamic = "force-dynamic";



export async function PUT(
  req: Request,
  { params }: { params: { id: string; docId: string } }
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
    const { status, rejectionReason } = body;

    const document = await prisma.applicationDocument.findUnique({
      where: { id: params.docId },
      include: {
        application: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!document || document.applicationId !== params.id) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update document status
    const updated = await prisma.applicationDocument.update({
      where: { id: params.docId },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
      },
    });

    const action =
      status === "VERIFIED" ? AuditAction.DOC_VERIFY : status === "REJECTED" ? AuditAction.DOC_REJECT : AuditAction.UPDATE;

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.APPLICATION,
      entityId: params.id,
      action,
      description: `Document ${document.documentType} set to ${status}`,
      metadata: {
        documentId: document.id,
        travellerId: document.travellerId,
        rejectionReason: rejectionReason || null,
      },
    });

    // If rejected, send email notification
    if (status === "REJECTED" && rejectionReason) {
      await sendVisaDocumentRejectedEmail(
        document.application.user.email,
        document.applicationId,
        document.application.country || "",
        document.application.visaType || "",
        [{ type: document.documentType || "Document", reason: rejectionReason }]
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error reviewing document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

