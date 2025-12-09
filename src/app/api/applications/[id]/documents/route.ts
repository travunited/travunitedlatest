import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl, uploadVisaDocument } from "@/lib/minio";
import { notify, notifyMultiple } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { getAdminUserIds, getVisaAdminEmail } from "@/lib/admin-contacts";
export const dynamic = "force-dynamic";

const APP_BASE_URL = process.env.NEXTAUTH_URL || "https://travunited.in";

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
        user: {
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
    const travellerIdValue = formData.get("travellerId") as string | null;
    const documentType = formData.get("documentType") as string;
    const requirementId = formData.get("requirementId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
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

    let resolvedTravellerId: string | null = null;
    if (travellerIdValue) {
      const appTraveller = await prisma.applicationTraveller.findFirst({
        where: {
          applicationId: params.id,
          travellerId: travellerIdValue,
        },
      });

      if (!appTraveller) {
        return NextResponse.json(
          { error: "Traveller not linked with application" },
          { status: 400 }
        );
      }
      resolvedTravellerId = travellerIdValue;
    }

    let requirement = null;
    if (requirementId) {
      requirement = await prisma.visaDocumentRequirement.findUnique({
        where: { id: requirementId },
      });

      if (!requirement) {
        return NextResponse.json(
          { error: "Invalid requirement reference" },
          { status: 400 }
        );
      }

      if (application.visaId && requirement.visaId !== application.visaId) {
        return NextResponse.json(
          { error: "Requirement does not belong to this visa" },
          { status: 400 }
        );
      }
    }

    // Upload to MinIO
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = [
      "applications",
      params.id,
      resolvedTravellerId || "application",
      requirementId || "general",
      `${Date.now()}-${file.name}`,
    ].join("/");
    
    await uploadVisaDocument(key, buffer, file.type);

    // Save document record
    const document = await prisma.applicationDocument.create({
      data: {
        applicationId: params.id,
        travellerId: resolvedTravellerId,
        requirementId: requirementId,
        filePath: key,
        documentType: requirement?.name || documentType,
        status: "PENDING",
        // @ts-expect-error regenerate Prisma client after adding fileSize
        fileSize: file.size,
      },
    });

    const documentName = document.documentType || documentType || "document";
    const applicantLink = `/dashboard/applications/${params.id}?requiredDoc=${document.id}`;

    await notify({
      userId: application.userId,
      type: "VISA_DOCUMENT_UPLOADED",
      title: "Document received",
      message: `We received ${documentName} for your ${
        application.country || "visa"
      } application.`,
      link: applicantLink,
      data: {
        applicationId: params.id,
        documentId: document.id,
        documentType: documentName,
        requirementId,
      },
      sendEmail: true,
    });

    const adminIds = await getAdminUserIds();
    if (adminIds.length) {
      await notifyMultiple(adminIds, {
        type: "ADMIN_VISA_DOCUMENT_UPLOADED",
        title: "New visa document uploaded",
        message: `${application.user?.name || application.user?.email || "Applicant"} uploaded ${documentName} for application ${params.id}.`,
        link: `/admin/applications/${params.id}`,
        data: {
          applicationId: params.id,
          documentId: document.id,
          documentType: documentName,
        },
      });
    }

    const adminEmail = getVisaAdminEmail();
    if (adminEmail) {
      const adminLink = `${APP_BASE_URL}/admin/applications/${params.id}`;
      await sendEmail({
        to: adminEmail,
        subject: `Document uploaded for application ${params.id}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New document received</h2>
            <p><strong>Application:</strong> ${params.id}</p>
            <p><strong>Applicant:</strong> ${application.user?.name || "Unknown"} (${application.user?.email || "N/A"})</p>
            <p><strong>Document:</strong> ${documentName}</p>
            ${
              requirement?.name
                ? `<p><strong>Requirement:</strong> ${requirement.name}</p>`
                : ""
            }
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
      documentId: document.id,
      fileKey: key,
      signedUrl: await getSignedDocumentUrl(key, 60),
      downloadUrl: `/api/media/${key}?download=true&filename=${encodeURIComponent(
        file.name
      )}`,
      message: "Document uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

