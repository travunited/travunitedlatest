import { prisma } from "@/lib/prisma";

type AdminRole = "STAFF_ADMIN" | "SUPER_ADMIN";

// Global fallback for all admin/support notifications
const DEFAULT_SUPPORT_EMAIL = "travunited.root@gmail.com";

export async function getAdminUserIds(
  roles: AdminRole[] = ["STAFF_ADMIN", "SUPER_ADMIN"]
) {
  const admins = await prisma.user.findMany({
    where: {
      role: {
        in: roles,
      },
    },
    select: { id: true },
  });

  return admins.map((admin) => admin.id);
}

function withFallback(value?: string | null) {
  return value?.trim() || undefined;
}

export function getVisaAdminEmail() {
  return (
    withFallback(process.env.ADMIN_VISA_EMAIL) ||
    withFallback(process.env.ADMIN_SUPPORT_EMAIL) ||
    withFallback(process.env.SUPPORT_EMAIL) ||
    DEFAULT_SUPPORT_EMAIL
  );
}

export function getTourAdminEmail() {
  return (
    withFallback(process.env.ADMIN_TOURS_EMAIL) ||
    withFallback(process.env.ADMIN_SUPPORT_EMAIL) ||
    withFallback(process.env.SUPPORT_EMAIL) ||
    DEFAULT_SUPPORT_EMAIL
  );
}

export function getSupportAdminEmail() {
  return (
    withFallback(process.env.ADMIN_SUPPORT_EMAIL) ||
    withFallback(process.env.SUPPORT_EMAIL) ||
    DEFAULT_SUPPORT_EMAIL
  );
}

