import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

function ensureContentAdmin(session: any) {
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  return null;
}

// GET - Load draft
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureContentAdmin(session);
    if (authError) return authError;

    const resolvedParams = await Promise.resolve(params);
    const draftKey = `visa-editor-${resolvedParams.id}`;

    // Try to get from database first (if we add a draft table later)
    // For now, return empty - client will use localStorage
    // This endpoint can be used to sync drafts across devices in the future

    return NextResponse.json({ draft: null, message: "Use localStorage for now" });
  } catch (error) {
    console.error("Error loading draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Save draft
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureContentAdmin(session);
    if (authError) return authError;

    const resolvedParams = await Promise.resolve(params);
    const body = await req.json();
    const { formData, requirements, faqs, subTypes, activeTab, heroImageMode, sampleVisaImageMode } = body;

    // For now, just acknowledge the save
    // In the future, we can store this in a database table
    // This allows the client to know the save was received

    return NextResponse.json({ 
      success: true, 
      message: "Draft saved (localStorage)",
      savedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error saving draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Clear draft
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureContentAdmin(session);
    if (authError) return authError;

    const resolvedParams = await Promise.resolve(params);
    
    // Acknowledge draft cleared
    return NextResponse.json({ success: true, message: "Draft cleared" });
  } catch (error) {
    console.error("Error clearing draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

