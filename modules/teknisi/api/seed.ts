import { prisma } from "@/lib/prisma";
export async function seedTeknisiModuleRegistration() {
  await prisma.module.upsert({ where: { slug: "teknisi" }, update: { name: "Teknisi HP", description: "Pengelolaan outlet, tiket servis HP, teknisi, pembayaran, dan monitoring." }, create: { slug: "teknisi", name: "Teknisi HP", description: "Pengelolaan outlet, tiket servis HP, teknisi, pembayaran, dan monitoring.", isActive: true } });
}
