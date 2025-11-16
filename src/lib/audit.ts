import { AuditAction, AuditEntityType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type LogAuditEventOptions = {
  adminId?: string | null;
  entityId?: string | null;
  entityType: AuditEntityType;
  action: AuditAction;
  description: string;
  metadata?: Prisma.InputJsonValue;
};

export async function logAuditEvent({
  adminId,
  entityId,
  entityType,
  action,
  description,
  metadata,
}: LogAuditEventOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: adminId ?? null,
        entityId: entityId ?? null,
        entityType,
        action,
        description,
        metadata: metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to record audit event", error);
  }
}

