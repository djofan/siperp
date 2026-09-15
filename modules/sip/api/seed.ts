import { prisma } from "@/lib/prisma";

export async function seedSipModuleRegistration() {
  await prisma.module.upsert({
    where: { slug: "sip" },
    update: {},
    create: {
      slug: "sip",
      name: "SIP",
      description: "Portal induk Yayasan Solidaritas Insan Peduli — company profile & CMS",
      isActive: true,
    },
  });
}
