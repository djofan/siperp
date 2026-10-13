import { prisma } from "@/lib/prisma";
export async function seedTeknisiModuleRegistration() {
  await prisma.module.upsert({ where: { slug: "teknisi" }, update: { name: "Teknisi HP", description: "Pengelolaan outlet, tiket servis HP, teknisi, sparepart, dan monitoring." }, create: { slug: "teknisi", name: "Teknisi HP", description: "Pengelolaan outlet, tiket servis HP, teknisi, sparepart, dan monitoring.", isActive: true } });
}
