import { prisma } from "@/lib/prisma";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function logActivity(message: string) {
  await prisma.accessLog.create({ data: { message } });
}

export async function listRecentActivity(limit = 8) {
  return prisma.accessLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countAccessChangesLast7Days() {
  return prisma.accessLog.count({
    where: { createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) } },
  });
}
