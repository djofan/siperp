import { prisma } from "@/lib/prisma";

export async function seedOjolModuleRegistration() {
  await prisma.module.upsert({
    where: { slug: "ojol" },
    update: {},
    create: {
      slug: "ojol",
      name: "Ojol Mengaji",
      description: "Program Ojol Mengaji — belum ada fitur, modul kosong.",
      isActive: false,
    },
  });
}
