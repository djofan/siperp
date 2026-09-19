import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mayAdministerAcademy } from "./admin-validation";

// Cache hanya selama satu request. Pencabutan akses berlaku pada request berikutnya.
// Maintenance publik tidak memblokir admin agar modul tetap dapat dikelola.
export const requireAcademyAdmin = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/admin/login?from=%2Fadmin%2Facademy");
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, name: true, isActive: true, isSuperadmin: true,
      moduleAccess: {
        where: { module: { slug: "academy" } },
        select: { role: true, module: { select: { slug: true } } },
      },
    },
  });
  if (!user?.isActive) redirect("/admin/login?from=%2Fadmin%2Facademy");
  if (!mayAdministerAcademy(user)) redirect("/admin?error=forbidden");
  return { id: user.id, name: user.name };
});
