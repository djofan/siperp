import "server-only";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getSuperadmin() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, isActive: true, isSuperadmin: true } });
  return user?.isActive && user.isSuperadmin ? user : null;
}
export async function requireSuperadmin() {
  const user = await getSuperadmin();
  if (!user) redirect("/admin/login?error=forbidden");
  return user;
}
