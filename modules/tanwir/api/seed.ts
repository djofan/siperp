import { prisma } from "@/lib/prisma";

export async function seedTanwirModuleRegistration() {
  await prisma.module.upsert({
    where: { slug: "tanwir" },
    update: {},
    create: {
      slug: "tanwir",
      name: "Tanwir Qurani",
      description: "Program pembelajaran Tanwir Qurani — belum ada fitur, modul kosong.",
      isActive: false,
    },
  });
}
