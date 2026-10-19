import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const getSipAdmin = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return session.isSuperadmin || session.moduleSlugs.includes("sip") ? { id: session.userId, name: session.name, isActive: true, isSuperadmin: session.isSuperadmin } : null;
});

export async function requireSipAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login?from=%2Fadmin%2Fsip");
  const user = await getSipAdmin();
  if (!user) redirect("/admin?error=forbidden");
  return user;
}
