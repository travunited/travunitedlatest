import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadVisaDocument } from "@/lib/minio";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

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

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG or WEBP images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image too large. Max 5 MB allowed." },
        { status: 400 }
      );
    }

    const folder = (formData.get("folder") as string) || "general";
    const scope = (formData.get("scope") as string) || "media";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName =
      sanitizeFileName(file.name || "image") || `image-${Date.now()}.jpg`;
    const key = `cms/${folder}/${scope}/${Date.now()}-${safeName}`;

    await uploadVisaDocument(key, buffer, file.type || "application/octet-stream");

    const bucket = process.env.MINIO_BUCKET!;
    const baseUrl =
      process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || "";
    const trimmedBase = baseUrl.replace(/\/$/, "");
    const url = trimmedBase
      ? `${trimmedBase}/${bucket}/${key}`
      : `/${bucket}/${key}`;

    return NextResponse.json({ key, url });
  } catch (error) {
    console.error("Media upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

