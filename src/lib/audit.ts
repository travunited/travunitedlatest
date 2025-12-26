import { AuditAction, AuditEntityType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import crypto from "crypto";

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
    // Verify adminId exists in User table before using it
    let validAdminId: string | null = null;
    if (adminId) {
      try {
        const admin = await prisma.user.findUnique({
          where: { id: adminId },
          select: { id: true },
        });
        if (admin) {
          validAdminId = adminId;
        } else {
          console.warn(`Audit log: Admin ID ${adminId} not found in User table, using null`);
        }
      } catch (error) {
        console.warn(`Audit log: Error verifying admin ID ${adminId}:`, error);
      }
    }

    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        adminId: validAdminId,
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

