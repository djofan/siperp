import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

export async function listModules() {
  return prisma.module.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, description: true, isActive: true },
  });
}

export async function countActiveModules() {
  return prisma.module.count({ where: { isActive: true } });
}

// Modul aktif yang boleh diakses akun ini — superadmin otomatis dapat semua.
export async function listAccessibleModules(session: SessionPayload) {
  const modules = await listModules();
  return modules.filter(
    (module) => module.isActive && (session.isSuperadmin || session.moduleSlugs.includes(module.slug))
  );
}

export async function setModuleActive(id: string, isActive: boolean) {
  await prisma.module.update({ where: { id }, data: { isActive } });
}

// Outlet operators work in their own website workspace rather than the Core dashboard.
export async function accountPanelRedirect(session: SessionPayload) {
  if (session.isSuperadmin) return null;
  const access = await prisma.moduleAccess.findMany({ where: { userId: session.userId, module: { isActive: true } }, select: { role: true, module: { select: { slug: true } } } });
  return access.length > 0 && access.every(item => item.module.slug === "teknisi" && item.role === "technician") ? "/teknisi/panel" : null;
}
