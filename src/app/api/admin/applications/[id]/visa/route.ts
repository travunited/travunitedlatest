import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadVisaDocument } from "@/lib/minio";
import { sendVisaApprovedEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            email: true,
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

    // Upload visa document
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `visas/${params.id}/visa-${Date.now()}-${file.name}`;
    
    await uploadVisaDocument(key, buffer, file.type);

    // Update application with visa URL and status
    const updated = await prisma.application.update({
      where: { id: params.id },
      data: {
        visaDocumentUrl: key, // In production, use full URL
        status: "APPROVED",
      },
    });

    // Send approval email
    await sendVisaApprovedEmail(
      application.user.email,
      application.id,
      application.country || "",
      application.visaType || ""
    );

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.APPLICATION,
      entityId: params.id,
      action: AuditAction.APPROVE,
      description: "Final visa uploaded and application approved",
      metadata: {
        documentKey: key,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error uploading visa:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

