import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl, uploadVisaDocument } from "@/lib/minio";
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

    const application = await prisma.application.findUnique({
      where: { id: params.id },
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
      },
    });

    return NextResponse.json({
      documentId: document.id,
      fileKey: key,
      signedUrl: await getSignedDocumentUrl(key, 60),
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

