import { prisma } from "@/lib/prisma";

export async function listModules() {
  return prisma.module.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, description: true, isActive: true },
  });
}

export async function countActiveModules() {
  return prisma.module.count({ where: { isActive: true } });
}
