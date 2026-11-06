import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Cache hanya selama satu request. Pencabutan akses berlaku pada request berikutnya.
// Maintenance publik tidak memblokir admin agar modul tetap dapat dikelola.
export const requireAcademyAdmin = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/admin/login?from=%2Fadmin%2Facademy");
  if (!session.isSuperadmin && session.moduleRoles?.academy !== "admin") redirect("/admin?error=forbidden");
  return { id: session.userId, name: session.name };
});
