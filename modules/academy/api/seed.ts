import { prisma } from "@/lib/prisma";

export async function seedAcademyModuleRegistration() {
  await prisma.module.upsert({
    where: { slug: "academy" },
    update: {},
    create: {
      slug: "academy",
      name: "Insan Academy",
      description: "Platform belajar Islami berbasis audio untuk LAZSIP",
      isActive: true,
    },
  });
}
