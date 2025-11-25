import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadVisaDocument } from "@/lib/minio";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Upload PDF, JPG or PNG only." },
        { status: 400 }
      );
    }

    const travellerName = formData.get("travellerName")?.toString().trim() || "traveller";
    const safeName = sanitizeFileName(`${travellerName}-${file.name || "passport"}`);
    const key = `tour-documents/passports/${session.user.id}/${Date.now()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadVisaDocument(key, buffer, contentType);

    return NextResponse.json({
      key,
      message: "Passport uploaded successfully",
    });
  } catch (error) {
    console.error("Passport upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload passport. Please try again." },
      { status: 500 }
    );
  }
}

