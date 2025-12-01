import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadVisaDocument } from "@/lib/minio";
import { notify } from "@/lib/notifications";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";
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

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type (only PDF)
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Upload invoice to MinIO
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `invoices/applications/${params.id}/invoice-${Date.now()}.pdf`;
    
    await uploadVisaDocument(key, buffer, "application/pdf");

    // Update application with invoice URL
    const updated = await prisma.application.update({
      where: { id: params.id },
      data: {
        invoiceUrl: key,
        invoiceUploadedAt: new Date(),
        invoiceUploadedByAdminId: session.user.id,
      },
    });

    // Log audit event
    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.APPLICATION,
      entityId: params.id,
      action: AuditAction.UPDATE,
      description: "Invoice uploaded",
      metadata: {
        invoiceKey: key,
      },
    });

    // Notify user
    try {
      await notify({
        userId: application.userId,
        type: "VISA_STATUS_CHANGED",
        title: "Invoice Available",
        message: `An invoice has been generated for your ${application.country || ""} ${application.visaType || ""} application. You can download it from your application dashboard.`,
        link: `/dashboard/applications/${params.id}`,
        data: {
          applicationId: params.id,
          country: application.country,
          visaType: application.visaType,
          hasInvoice: true,
        },
        sendEmail: true,
      });
    } catch (notifyError) {
      console.error("Error sending notification for invoice upload:", notifyError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ 
      message: "Invoice uploaded successfully",
      invoiceUrl: key 
    });
  } catch (error) {
    console.error("Error uploading invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
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

    // Remove invoice URL
    const updated = await prisma.application.update({
      where: { id: params.id },
      data: {
        invoiceUrl: null,
        invoiceUploadedAt: null,
        invoiceUploadedByAdminId: null,
      },
    });

    // Log audit event
    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.APPLICATION,
      entityId: params.id,
      action: AuditAction.UPDATE,
      description: "Invoice removed",
    });

    // Notify user
    try {
      await notify({
        userId: application.userId,
        type: "VISA_STATUS_CHANGED",
        title: "Invoice Removed",
        message: `The invoice for your ${application.country || ""} ${application.visaType || ""} application has been removed. A new invoice will be generated if needed.`,
        link: `/dashboard/applications/${params.id}`,
        data: {
          applicationId: params.id,
          country: application.country,
          visaType: application.visaType,
        },
        sendEmail: true,
      });
    } catch (notifyError) {
      console.error("Error sending notification for invoice removal:", notifyError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ message: "Invoice removed successfully" });
  } catch (error) {
    console.error("Error removing invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

