import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { participantInput, ParticipantError, type ParticipantModule } from "./participant-policy";

async function targetAccount(tx: Prisma.TransactionClient, moduleSlug: ParticipantModule, id: string) {
  const userSelect = { id: true, isSuperadmin: true, moduleAccess: { include: { module: true } } } as const;
  const profile = moduleSlug === "academy"
    ? await tx.zakatAcademyProfile.findFirst({ where: { id, deletedAt: null }, include: { user: { select: userSelect } } })
    : await tx.teknisiParticipant.findFirst({ where: { id, deletedAt: null }, include: { user: { select: userSelect } } });
  if (!profile) throw new ParticipantError("Akun tidak ditemukan atau sudah dihapus.");
  if (profile.user.isSuperadmin || profile.user.moduleAccess.some(access => access.module.slug === moduleSlug && ["admin", "manager", "teacher"].includes(access.role))) throw new ParticipantError("Akun pengelola tidak dapat diubah melalui panel peserta.");
  return profile;
}
export async function editParticipantAccount(moduleSlug: ParticipantModule, id: string, form: FormData) {
  const input = participantInput(form, moduleSlug, false);
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
  await prisma.$transaction(async tx => {
    const profile = await targetAccount(tx, moduleSlug, id);
    if (moduleSlug === "academy") {
      await tx.zakatAcademyProfile.update({ where: { id }, data: { address: input.address, phone: input.phone, gender: input.gender } });
    } else {
      const outletId = String(form.get("outletId") ?? "").trim();
      await tx.$queryRaw`SELECT id FROM teknisi_outlets WHERE id = ${outletId} FOR UPDATE`;
      if (!await tx.teknisiOutlet.findFirst({ where: { id: outletId, isActive: true } })) throw new ParticipantError("Pilih outlet yang aktif.");
      const technician = await tx.teknisiTechnician.findUnique({ where: { userId: profile.userId } });
      if (await tx.teknisiTechnician.findFirst({ where: { outletId, isActive: true, userId: { not: profile.userId } } })) throw new ParticipantError("Outlet ini sudah memiliki teknisi aktif.");
      if (technician && technician.outletId !== outletId && await tx.teknisiTicket.count({ where: { technicianId: technician.id, status: { notIn: ["collected", "cancelled"] } } })) throw new ParticipantError("Selesaikan tiket aktif sebelum memindahkan teknisi.");
      await tx.teknisiParticipant.update({ where: { id }, data: { address: input.address, phone: input.phone } });
      const specialty = String(form.get("specialty") ?? "").trim().slice(0, 191) || technician?.specialty || "Servis HP";
      await tx.teknisiTechnician.upsert({ where: { userId: profile.userId }, create: { userId: profile.userId, name: input.name, outletId, activeOutletId: outletId, specialty }, update: { name: input.name, outletId, activeOutletId: outletId, specialty, isActive: true } });
      const registration = await tx.module.findUniqueOrThrow({ where: { slug: "teknisi" } });
      await tx.moduleAccess.upsert({ where: { userId_moduleId: { userId: profile.userId, moduleId: registration.id } }, create: { userId: profile.userId, moduleId: registration.id, role: "technician" }, update: { role: "technician" } });
    }
    await tx.user.update({ where: { id: profile.userId }, data: { name: input.name, ...(passwordHash ? { passwordHash } : {}) } });
    if (moduleSlug === "academy" && passwordHash) await tx.zakatAcademyProfile.update({ where: { id }, data: { mustChangePassword: false } });
  });
}
export async function deleteParticipantAccount(moduleSlug: ParticipantModule, id: string) {
  await prisma.$transaction(async tx => {
    const profile = await targetAccount(tx, moduleSlug, id);
    if (moduleSlug === "academy") await tx.zakatAcademyProfile.update({ where: { id }, data: { deletedAt: new Date(), phone: null } });
    else {
      await tx.teknisiParticipant.update({ where: { id }, data: { deletedAt: new Date(), phone: null } });
      await tx.teknisiTechnician.updateMany({ where: { userId: profile.userId }, data: { isActive: false, activeOutletId: null } });
    }
    await tx.moduleAccess.deleteMany({ where: { userId: profile.userId, module: { slug: moduleSlug } } });
    const otherRoles = profile.user.moduleAccess.some(access => access.module.slug !== moduleSlug);
    const memberships = await tx.user.findUniqueOrThrow({ where: { id: profile.userId }, select: {
      academyProfile: { select: { deletedAt: true } }, teknisiParticipant: { select: { deletedAt: true } },
      tanwirMember: { select: { id: true } }, ojolMember: { select: { id: true } },
    } });
    const otherMember = (moduleSlug !== "academy" && memberships.academyProfile && !memberships.academyProfile.deletedAt)
      || (moduleSlug !== "teknisi" && memberships.teknisiParticipant && !memberships.teknisiParticipant.deletedAt)
      || memberships.tanwirMember || memberships.ojolMember;
    if (!otherRoles && !otherMember) await tx.user.update({ where: { id: profile.userId }, data: { isActive: false } });
  });
}
