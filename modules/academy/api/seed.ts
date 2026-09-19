import { prisma } from "@/lib/prisma";

export async function seedAcademyModuleRegistration() {
  await prisma.module.upsert({
    where: { slug: "academy" },
    update: {},
    create: {
      slug: "academy",
      name: "Zakat Academy",
      description: "Platform belajar Islami berbasis video untuk LAZSIP",
      isActive: true,
    },
  });
}
