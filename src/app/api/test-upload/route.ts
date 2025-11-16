import { NextResponse } from "next/server";
import { uploadVisaDocument } from "@/lib/minio";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `test/${Date.now()}-${file.name}`;

    await uploadVisaDocument(key, buffer, file.type || "application/octet-stream");

    return NextResponse.json({
      success: true,
      key,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}

