import { prisma } from "@/lib/prisma";

export async function listNewsForAdmin() {
  return prisma.sipNews.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getNewsById(id: string) {
  return prisma.sipNews.findUnique({ where: { id } });
}

export async function listPublishedNews() {
  return prisma.sipNews.findMany({
    where: { status: "published" },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPublishedNewsById(id: string) {
  return prisma.sipNews.findFirst({ where: { id, status: "published" } });
}

interface NewsInput {
  title: string;
  content: string;
  image?: string;
  isPinned: boolean;
  status: string;
}

export async function createNews(input: NewsInput) {
  return prisma.sipNews.create({ data: input });
}

export async function updateNews(id: string, input: NewsInput) {
  return prisma.sipNews.update({ where: { id }, data: input });
}

export async function deleteNews(id: string) {
  await prisma.sipNews.delete({ where: { id } });
}
