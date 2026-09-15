import { prisma } from "@/lib/prisma";

export async function seedLazsipModuleRegistration() {
  await prisma.module.upsert({
    where: { slug: "lazsip" },
    update: {},
    create: {
      slug: "lazsip",
      name: "LAZSIP",
      description: "LAZ Solidaritas Insan Peduli — zakat & donasi",
      isActive: true,
    },
  });
}
