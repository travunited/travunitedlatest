import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const policySchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  version: z.string().min(1),
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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureSuperAdmin(session);
    if (authError) return authError;

    const policies = await prisma.sitePolicy.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Error fetching policies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureSuperAdmin(session);
    if (authError) return authError;

    // TypeScript guard: session is guaranteed to be non-null after ensureSuperAdmin check
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = policySchema.parse(body);

    // Check if policy exists
    const existing = await prisma.sitePolicy.findUnique({
      where: { key: data.key },
    });

    let policy;
    if (existing) {
      // Update existing policy
      policy = await prisma.sitePolicy.update({
        where: { key: data.key },
        data: {
          title: data.title,
          content: data.content,
          version: data.version,
        },
      });

      await logAuditEvent({
        adminId: session.user.id,
        entityType: AuditEntityType.SETTINGS,
        entityId: policy.id,
        action: AuditAction.UPDATE,
        description: `Updated policy: ${data.key} to version ${data.version}`,
        metadata: {
          key: data.key,
          version: data.version,
        },
      });
    } else {
      // Create new policy
      policy = await prisma.sitePolicy.create({
        data: {
          key: data.key,
          title: data.title,
          content: data.content,
          version: data.version,
        },
      });

      await logAuditEvent({
        adminId: session.user.id,
        entityType: AuditEntityType.SETTINGS,
        entityId: policy.id,
        action: AuditAction.CREATE,
        description: `Created policy: ${data.key} version ${data.version}`,
        metadata: {
          key: data.key,
          version: data.version,
        },
      });
    }

    return NextResponse.json(policy);
  } catch (error: any) {
    console.error("Error saving policy:", error);
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

