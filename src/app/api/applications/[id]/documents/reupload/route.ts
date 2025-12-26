import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadVisaDocument } from "@/lib/minio";
import { notify, notifyMultiple } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { getAdminUserIds, getVisaAdminEmail } from "@/lib/admin-contacts";
export const dynamic = "force-dynamic";

const APP_BASE_URL = process.env.NEXTAUTH_URL || "https://travunited.com";

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

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        User_Application_userIdToUser: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!application || application.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentId = formData.get("documentId") as string;

    if (!file || !documentId) {
      return NextResponse.json(
        { error: "File and document ID required" },
        { status: 400 }
      );
    }

    // Find the rejected document
    const existingDoc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!existingDoc || existingDoc.applicationId !== params.id) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Only allow re-upload of rejected documents
    if (existingDoc.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Only rejected documents can be re-uploaded" },
        { status: 400 }
      );
    }

    // Allow re-upload if application is in a state that allows document updates
    // Block only if application is DRAFT (should use regular upload) or EXPIRED
    if (application.status === "EXPIRED") {
      return NextResponse.json(
        { error: "Cannot re-upload documents for expired applications" },
        { status: 400 }
      );
    }

    // Validate file
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 20MB" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and PDF files are allowed" },
        { status: 400 }
      );
    }

    // Upload new file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `applications/${params.id}/${existingDoc.travellerId}/${existingDoc.documentType}-${Date.now()}-${file.name}`;

    await uploadVisaDocument(key, buffer, file.type);

    // Update document record - clear rejection reason when re-uploading
    await prisma.document.update({
      where: { id: documentId },
      data: {
        filePath: key,
        status: "PENDING",
        rejectionReason: null, // Clear rejection reason on re-upload
        updatedAt: new Date(),
        fileSize: file.size,
      },
    });

    const documentName = existingDoc.documentType || "Document";
    const applicantLink = `/dashboard/applications/${params.id}?requiredDoc=${existingDoc.id}`;

    await notify({
      userId: application.userId,
      type: "VISA_DOCUMENT_UPLOADED",
      title: "Document re-uploaded",
      message: `We received the updated ${documentName} for your ${application.country || "visa"
        } application.`,
      link: applicantLink,
      data: {
        applicationId: params.id,
        documentId: existingDoc.id,
        documentType: documentName,
      },
      sendEmail: true,
    });

    const adminIds = await getAdminUserIds();
    const appWithUser = application as any;
    const user = appWithUser.User_Application_userIdToUser;

    if (adminIds.length) {
      await notifyMultiple(adminIds, {
        type: "ADMIN_VISA_DOCUMENT_UPLOADED",
        title: "Visa document re-uploaded",
        message: `${user?.name || user?.email || "Applicant"} re-uploaded ${documentName} for application ${params.id}.`,
        link: `/admin/applications/${params.id}`,
        data: {
          applicationId: params.id,
          documentId: existingDoc.id,
          documentType: documentName,
        },
      });
    }

    const adminEmail = getVisaAdminEmail();
    if (adminEmail) {
      const adminLink = `${APP_BASE_URL}/admin/applications/${params.id}`;
      await sendEmail({
        to: adminEmail,
        subject: `Document re-uploaded for application ${params.id}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Document re-uploaded</h2>
            <p><strong>Application:</strong> ${params.id}</p>
            <p><strong>Applicant:</strong> ${user?.name || "Unknown"} (${user?.email || "N/A"})</p>
            <p><strong>Document:</strong> ${documentName}</p>
            <p>
              <a href="${adminLink}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
                Review application
              </a>
            </p>
          </div>
        `,
        category: "visa",
      });
    }

    return NextResponse.json({
      message: "Document re-uploaded successfully",
      downloadUrl: `/api/media/${key}?download=true&filename=${encodeURIComponent(
        file.name || existingDoc.documentType || "document"
      )}`,
    });
  } catch (error) {
    console.error("Error re-uploading document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

