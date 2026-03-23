import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadVisaDocument } from "@/lib/minio";
import { buildMediaDownloadUrlFromKey } from "@/lib/media";

// Use runtime = 'nodejs' to support standard API route features if needed,
// but usually not strictly required unless using Node-specific APIs not in Edge.
// 'force-dynamic' ensures it's not cached aggressively.
export const dynamic = "force-dynamic";

// GET - List all templates for a VISA
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const { id } = await Promise.resolve(params);
        const session = await getServerSession(authOptions);
        const isAdmin =
            session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const templates = await prisma.documentTemplate.findMany({
            where: {
                visaId: id,
            },
            orderBy: {
                sortOrder: "asc",
            },
        });

        // Generate signed URLs for each template
        const templatesWithUrls = await Promise.all(
            templates.map(async (template) => {
                let downloadUrl = null;
                downloadUrl = buildMediaDownloadUrlFromKey(template.fileKey, template.fileName || "template");
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

// POST - Create a new template for a VISA
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const { id } = await Promise.resolve(params);
        const session = await getServerSession(authOptions);
        const isAdmin =
            session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Verify VISA exists
        const visa = await prisma.visa.findUnique({
            where: { id },
        });

        if (!visa) {
            return NextResponse.json({ error: "Visa not found" }, { status: 404 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const name = formData.get("name") as string;
        const description = formData.get("description") as string | null;
        const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

        const isActiveRaw = formData.get("isActive");
        const isActive = isActiveRaw === null ? true : isActiveRaw === "true";

        if (!file || !name) {
            return NextResponse.json(
                { error: "File and name are required" },
                { status: 400 }
            );
        }

        console.log(`[Template Upload] Processing file: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

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
            console.error(`[Template Upload] Invalid file type: ${file.type}`);
            return NextResponse.json(
                { error: `Invalid file type: ${file.type}. Only PDF, DOC, and DOCX files are allowed.` },
                { status: 400 }
            );
        }

        // Upload file to MinIO
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        // Store under templates/visa-id/... to keep organized
        const key = `templates/visas/${id}/${timestamp}-${sanitizedFileName}`;

        // Check MinIO config
        if (!process.env.MINIO_ENDPOINT || !process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
            console.error("MinIO configuration missing");
            // Don't expose this to client unless admin
            // return NextResponse.json({ error: "Storage configuration invalid" }, { status: 500 });
        }

        // Upload file to MinIO
        try {
            console.log(`[Template Upload] Uploading to MinIO: ${key}`);
            await uploadVisaDocument(key, buffer, file.type);
            console.log(`[Template Upload] Upload successful`);
        } catch (uploadError: any) {
            console.error("Error uploading to MinIO:", uploadError);
            return NextResponse.json(
                {
                    error: "Failed to upload file to storage",
                    message: uploadError.message || "Storage upload failed"
                },
                { status: 502 } // Bad Gateway for upstream storage failure
            );
        }

        // Create template record
        try {
            const template = await prisma.documentTemplate.create({
                data: {
                    visaId: id,
                    name,
                    description: description || null,
                    fileKey: key,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                    sortOrder,
                    isActive,
                },
            });
            return NextResponse.json(template, { status: 201 });
        } catch (dbError: any) {
            console.error("Error creating database record:", dbError);
            return NextResponse.json(
                {
                    error: "Failed to save template to database",
                    message: dbError.message || "Database operation failed"
                },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error("Unexpected error in template creation:", error);
        return NextResponse.json(
            { error: "Internal server error", message: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete a template
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } } // This ID is likely the VISA ID from the route path, e.g. /visas/[id]/templates
) {
    // Note: The delete functionality often requires the template ID.
    // However, in the Next.js App Router, if this file is [.../templates/route.ts], 
    // it handles the collection. 
    // To handle deletion of a SPECIFIC template, we usually need `[.../templates/[templateId]/route.ts]`.
    // I will verify if I need a separate route file for DELETE or if I can handle it here if it was passed differently.
    // Based on the Country implementation, there might be a separate route for individual templates.
    // I will CREATE a separate route file for individual template operations if needed, 
    // but for now, this file handles collection operations.
    return NextResponse.json({ error: "Method not allowed on collection" }, { status: 405 });
}
