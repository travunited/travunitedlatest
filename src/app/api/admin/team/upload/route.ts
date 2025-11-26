import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadVisaDocument } from "@/lib/minio";

export const dynamic = "force-dynamic";

function ensureAdmin(session: any) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureAdmin(session);
    if (authError) return authError;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // "photo" or "resume"

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file based on type
    if (type === "photo") {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Photo size must be less than 5MB" },
          { status: 400 }
        );
      }
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Only JPG and PNG images are allowed for photos" },
          { status: 400 }
        );
      }
    } else if (type === "resume") {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Resume size must be less than 10MB" },
          { status: 400 }
        );
      }
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Only PDF and Word documents are allowed for resumes" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'photo' or 'resume'" },
        { status: 400 }
      );
    }

    // Upload file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const key = `team/${type}s/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    await uploadVisaDocument(key, buffer, file.type);

    return NextResponse.json({
      key,
      url: `/api/media/${key}`, // Use media proxy
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

