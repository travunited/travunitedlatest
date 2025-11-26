import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updatePolicySchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
});

function ensureSuperAdmin(session: any) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden - Super Admin access required" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureSuperAdmin(session);
    if (authError) return authError;

    const policy = await prisma.sitePolicy.findUnique({
      where: { key: params.key },
    });

    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Error fetching policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureSuperAdmin(session);
    if (authError) return authError;

    // TypeScript guard: session is guaranteed to be non-null after ensureSuperAdmin check
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updatePolicySchema.parse(body);

    const existing = await prisma.sitePolicy.findUnique({
      where: { key: params.key },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    const policy = await prisma.sitePolicy.update({
      where: { key: params.key },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.version && { version: data.version }),
      },
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.SETTINGS,
      entityId: policy.id,
      action: AuditAction.UPDATE,
      description: `Updated policy: ${params.key}${data.version ? ` to version ${data.version}` : ""}`,
      metadata: {
        key: params.key,
        version: data.version || existing.version,
      },
    });

    return NextResponse.json(policy);
  } catch (error: any) {
    console.error("Error updating policy:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureSuperAdmin(session);
    if (authError) return authError;

    // TypeScript guard: session is guaranteed to be non-null after ensureSuperAdmin check
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policy = await prisma.sitePolicy.findUnique({
      where: { key: params.key },
    });

    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    await prisma.sitePolicy.delete({
      where: { key: params.key },
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.SETTINGS,
      entityId: policy.id,
      action: AuditAction.DELETE,
      description: `Deleted policy: ${params.key}`,
      metadata: {
        key: params.key,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

