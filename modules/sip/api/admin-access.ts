import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const getSipAdmin = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, isActive: true, isSuperadmin: true, moduleAccess: { where: { module: { slug: "sip", isActive: true } }, select: { id: true } } },
  });
  return user?.isActive && (user.isSuperadmin || user.moduleAccess.length > 0) ? user : null;
});

export async function requireSipAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login?from=%2Fadmin%2Fsip");
  const user = await getSipAdmin();
  if (!user) redirect("/admin?error=forbidden");
  return user;
}
