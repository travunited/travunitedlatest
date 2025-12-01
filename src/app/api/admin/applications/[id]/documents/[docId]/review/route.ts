import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVisaDocumentRejectedEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
import { notify, notifyMultiple } from "@/lib/notifications";
import { getAdminUserIds, getVisaAdminEmail } from "@/lib/admin-contacts";
import { sendEmail } from "@/lib/email";
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
                id: true,
                email: true,
                name: true,
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

    // Normalize status: VERIFIED -> APPROVED
    const normalizedStatus = status === "VERIFIED" ? "APPROVED" : status;
    
    // Update document status
    const updated = await prisma.applicationDocument.update({
      where: { id: params.docId },
      data: {
        status: normalizedStatus,
        rejectionReason: normalizedStatus === "REJECTED" ? rejectionReason : null,
      },
    });

    const action =
      normalizedStatus === "APPROVED" ? AuditAction.DOC_VERIFY : normalizedStatus === "REJECTED" ? AuditAction.DOC_REJECT : AuditAction.UPDATE;

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.APPLICATION,
      entityId: params.id,
      action,
      description: `Document ${document.documentType} set to ${normalizedStatus}`,
      metadata: {
        documentId: document.id,
        travellerId: document.travellerId,
        rejectionReason: rejectionReason || null,
      },
    });

    // Send notifications based on status
    if (normalizedStatus === "APPROVED") {
      // Notify user when document is approved
      await notify({
        userId: document.application.userId,
        type: "VISA_DOCUMENT_UPLOADED",
        title: "Document Approved",
        message: `Your document "${document.documentType || "Document"}" has been approved for your ${document.application.country || ""} ${document.application.visaType || ""} application.`,
        link: `/dashboard/applications/${document.applicationId}`,
        data: {
          applicationId: document.applicationId,
          documentType: document.documentType,
          documentId: document.id,
          status: "APPROVED",
        },
        sendEmail: true,
      });
    } else if (normalizedStatus === "REJECTED" && rejectionReason) {
      await sendVisaDocumentRejectedEmail(
        document.application.user.email,
        document.applicationId,
        document.application.country || "",
        document.application.visaType || "",
        [
          {
            type: document.documentType || "Document",
            reason: rejectionReason,
            documentId: document.id,
          },
        ]
      );
      await notify({
        userId: document.application.userId,
        type: "VISA_DOCUMENT_REJECTED",
        title: "Document Rejected",
        message: `Document "${document.documentType || "Document"}" was rejected. ${rejectionReason}`,
        link: `/dashboard/applications/${document.applicationId}?requiredDoc=${document.id}`,
        data: {
          applicationId: document.applicationId,
          documentType: document.documentType,
          documentId: document.id,
          reason: rejectionReason,
        },
        sendEmail: false, // Email already sent above
      });

      const adminIds = await getAdminUserIds();
      if (adminIds.length) {
        await notifyMultiple(adminIds, {
          type: "ADMIN_VISA_DOCUMENT_UPLOADED",
          title: "Visa document rejected",
          message: `${document.application.user?.name || document.application.user.email || "Applicant"}'s ${document.documentType || "document"} was rejected.`,
          link: `/admin/applications/${document.applicationId}`,
          data: {
            applicationId: document.applicationId,
            documentId: document.id,
            documentType: document.documentType,
            reason: rejectionReason,
          },
        });
      }

      const adminEmail = getVisaAdminEmail();
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `Document rejected for application ${document.applicationId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Document rejected</h2>
              <p><strong>Application:</strong> ${document.applicationId}</p>
              <p><strong>Applicant:</strong> ${
                document.application.user?.name || document.application.user.email
              }</p>
              <p><strong>Document:</strong> ${document.documentType || "Document"}</p>
              <p><strong>Reason:</strong> ${rejectionReason}</p>
              <p>
                <a href="${process.env.NEXTAUTH_URL || "https://travunited.com"}/admin/applications/${
            document.applicationId
          }" style="display:inline-block;padding:10px 16px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;">
                  Review application
                </a>
              </p>
            </div>
          `,
          category: "visa",
        });
      }
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

