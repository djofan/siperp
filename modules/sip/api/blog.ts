import { prisma } from "@/lib/prisma";

export async function listBlogForAdmin() {
  return prisma.sipBlog.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getBlogById(id: string) {
  return prisma.sipBlog.findUnique({ where: { id } });
}

export async function listPublishedBlog() {
  return prisma.sipBlog.findMany({
    where: { status: "published" },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPublishedBlogById(id: string) {
  return prisma.sipBlog.findFirst({ where: { id, status: "published" } });
}

interface BlogInput {
  title: string;
  content: string;
  image?: string;
  isPinned: boolean;
  status: string;
}

export async function createBlog(input: BlogInput) {
  return prisma.sipBlog.create({ data: input });
}

export async function updateBlog(id: string, input: BlogInput) {
  return prisma.sipBlog.update({ where: { id }, data: input });
}

export async function deleteBlog(id: string) {
  await prisma.sipBlog.delete({ where: { id } });
}
