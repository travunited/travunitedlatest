import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadVisaDocument } from "@/lib/minio";
import { buildMediaProxyUrlFromKey } from "@/lib/media";
import {
  getAllowedImageTypes,
  MAX_IMAGE_SIZE_BYTES,
  isValidImageType,
  isValidImageSize,
} from "@/lib/image-upload-config";

export const dynamic = "force-dynamic";

const sanitizeFileName = (value: string) =>
  value.replace(/[^a-zA-Z0-9.\-_]/g, "_").replace(/_+/g, "_");

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const folder = (formData.get("folder") as string) || "general";
    const scope = (formData.get("scope") as string) || "media";

    console.log("Upload request:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folder,
      scope,
    });

    // Validate file type
    if (!isValidImageType(file.type)) {
      console.error("Invalid file type:", file.type);
      const allowedTypes = getAllowedImageTypes();
      const formatNames = allowedTypes
        .map(t => t === 'image/jpeg' || t === 'image/jpg' ? 'JPG' : t.split('/')[1]?.toUpperCase())
        .join(', ');
      return NextResponse.json(
        { 
          error: `Invalid file type. Only ${formatNames} images are allowed.`,
          code: "INVALID_FILE_TYPE"
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (!isValidImageSize(file.size)) {
      console.error("File too large:", file.size);
      return NextResponse.json(
        { 
          error: "Image too large. Maximum allowed size is 5 MB.",
          code: "FILE_TOO_LARGE"
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName =
      sanitizeFileName(file.name || "image") || `image-${Date.now()}.jpg`;
    const key = `cms/${folder}/${scope}/${Date.now()}-${safeName}`;

    console.log("Uploading to MinIO:", { key, bucket: process.env.MINIO_BUCKET });

    await uploadVisaDocument(key, buffer, file.type || "application/octet-stream");

    const bucket = process.env.MINIO_BUCKET!;
    const baseUrl =
      process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || "";
    const trimmedBase = baseUrl.replace(/\/$/, "");
    const url = trimmedBase
      ? `${trimmedBase}/${bucket}/${key}`
      : `/${bucket}/${key}`;

    const proxyUrl = buildMediaProxyUrlFromKey(key);

    console.log("Upload successful:", { key, url, proxyUrl });

    return NextResponse.json({ key, url, proxyUrl });
  } catch (error) {
    console.error("Media upload failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to upload image: ${errorMessage}` },
      { status: 500 }
    );
  }
}

