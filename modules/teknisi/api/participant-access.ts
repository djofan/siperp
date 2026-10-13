import "server-only";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
export async function getTeknisiParticipant() {
  const session = await getSession();
  if (!session) return null;
  const registration = await prisma.module.findUnique({ where: { slug: "teknisi" }, select: { isActive: true } });
  if (!registration?.isActive) return null;
  return prisma.teknisiParticipant.findFirst({ where: { userId: session.userId, deletedAt: null, user: { isActive: true } }, select: { id: true, nip: true, address: true, phone: true, user: { select: { name: true } } } });
}
export async function requireTeknisiParticipant() {
  const participant = await getTeknisiParticipant();
  if (!participant) redirect("/teknisi/masuk");
  return participant;
}
