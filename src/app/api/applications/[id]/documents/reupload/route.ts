import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadVisaDocument } from "@/lib/minio";
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

    // Only allow re-upload if status is SUBMITTED or IN_PROCESS
    if (application.status !== "SUBMITTED" && application.status !== "IN_PROCESS") {
      return NextResponse.json(
        { error: "Cannot re-upload documents at this stage" },
        { status: 400 }
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
    const existingDoc = await prisma.applicationDocument.findUnique({
      where: { id: documentId },
    });

    if (!existingDoc || existingDoc.applicationId !== params.id) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (existingDoc.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Only rejected documents can be re-uploaded" },
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
    await prisma.applicationDocument.update({
      where: { id: documentId },
      data: {
        filePath: key,
        status: "PENDING",
        rejectionReason: null, // Clear rejection reason on re-upload
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Document re-uploaded successfully",
    });
  } catch (error) {
    console.error("Error re-uploading document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

