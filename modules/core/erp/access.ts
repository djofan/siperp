import "server-only";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getSuperadmin() {
  const session = await getSession();
  if (!session) return null;
  return session.isSuperadmin ? { id: session.userId, name: session.name, isActive: true, isSuperadmin: true } : null;
}
export async function requireSuperadmin() {
  const user = await getSuperadmin();
  if (!user) redirect("/admin/login?error=forbidden");
  return user;
}
