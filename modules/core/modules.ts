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
