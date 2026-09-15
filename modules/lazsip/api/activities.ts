import { prisma } from "@/lib/prisma";

export async function listActivities() {
  return prisma.lazsipActivity.findMany({
    orderBy: [{ isPinned: "desc" }, { date: "desc" }],
  });
}

export async function getActivityById(id: string) {
  return prisma.lazsipActivity.findUnique({ where: { id } });
}

interface ActivityInput {
  title: string;
  description: string;
  image?: string;
  date: Date;
  isPinned: boolean;
}

export async function createActivity(input: ActivityInput) {
  return prisma.lazsipActivity.create({ data: input });
}

export async function updateActivity(id: string, input: ActivityInput) {
  return prisma.lazsipActivity.update({ where: { id }, data: input });
}

export async function deleteActivity(id: string) {
  await prisma.lazsipActivity.delete({ where: { id } });
}
