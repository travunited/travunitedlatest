import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadVisaDocument } from "@/lib/minio";
import { getSignedDocumentUrl } from "@/lib/minio";

export const dynamic = "force-dynamic";

// GET - List all templates for a country
export async function GET(
  req: Request,
  { params }: { params: { countryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin =
      session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await prisma.documentTemplate.findMany({
      where: {
        countryId: params.countryId,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    // Generate signed URLs for each template
    const templatesWithUrls = await Promise.all(
      templates.map(async (template) => {
        let downloadUrl = null;
        try {
          downloadUrl = await getSignedDocumentUrl(template.fileKey, 3600); // 1 hour expiry
        } catch (error) {
          console.error(`Error generating signed URL for template ${template.id}:`, error);
        }
        return {
          ...template,
          downloadUrl,
        };
      })
    );

    return NextResponse.json(templatesWithUrls);
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new template
export async function POST(
  req: Request,
  { params }: { params: { countryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin =
      session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify country exists
    const country = await prisma.country.findUnique({
      where: { id: params.countryId },
    });

    if (!country) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

    if (!file || !name) {
      return NextResponse.json(
        { error: "File and name are required" },
        { status: 400 }
      );
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 20MB" },
        { status: 400 }
      );
    }

    // Validate file type (PDF, DOCX, DOC)
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF, DOC, and DOCX files are allowed" },
        { status: 400 }
      );
    }

    // Upload file to MinIO
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `templates/${params.countryId}/${timestamp}-${sanitizedFileName}`;

    await uploadVisaDocument(key, buffer, file.type);

    // Create template record
    const template = await prisma.documentTemplate.create({
      data: {
        countryId: params.countryId,
        name,
        description: description || null,
        fileKey: key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        sortOrder,
        isActive: true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
