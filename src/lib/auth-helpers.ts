import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "STAFF_ADMIN" && user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAuth();
  if (user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }
  return user;
}

export function isAdmin(role: string | undefined) {
  return role === "STAFF_ADMIN" || role === "SUPER_ADMIN";
}

export function isSuperAdmin(role: string | undefined) {
  return role === "SUPER_ADMIN";
}

