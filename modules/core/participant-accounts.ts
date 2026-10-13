import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { participantInput, ParticipantError, type ParticipantModule } from "./participant-policy";
import { allocateNip } from "./participant-sequence";

// Internal service. Admin Server Actions must authorize the caller before creating an account.
export async function createParticipantAccount(moduleSlug: ParticipantModule, form: FormData) {
  const input = participantInput(form, moduleSlug);
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.$transaction(async tx => {
    const outletId = moduleSlug === "teknisi" ? String(form.get("outletId") ?? "").trim() : "";
    if (moduleSlug === "teknisi") {
      await tx.$queryRaw`SELECT id FROM teknisi_outlets WHERE id = ${outletId} FOR UPDATE`;
      if (!await tx.teknisiOutlet.findFirst({ where: { id: outletId, isActive: true } })) throw new ParticipantError("Pilih outlet yang aktif.");
      if (await tx.teknisiTechnician.findFirst({ where: { outletId, isActive: true } })) throw new ParticipantError("Outlet ini sudah memiliki teknisi. Setiap outlet hanya boleh memiliki satu teknisi aktif.");
    }
    let courseId = "";
    if (moduleSlug === "academy") {
      courseId = String(form.get("courseId") ?? "").trim();
      if (courseId) {
        await tx.$queryRaw`SELECT id FROM zakat_academy_courses WHERE id = ${courseId} FOR UPDATE`;
        const course = await tx.zakatAcademyCourse.findUnique({ where: { id: courseId }, include: { _count: { select: { enrollments: true } } } });
        if (!course?.isPublished || !course.registrationOpen || (!course.isSimulation && course.startsAt && course.startsAt <= new Date())) throw new ParticipantError("Pendaftaran program ini belum dibuka atau sudah ditutup.");
        if (course._count.enrollments >= course.quota) throw new ParticipantError("Kuota program sudah penuh.");
      }
    }
    const nip = await allocateNip(tx, moduleSlug);
    const user = await tx.user.create({ data: { name: input.name, email: `${nip.toLowerCase()}@peserta.sip.invalid`, passwordHash } });
    if (moduleSlug === "academy") {
      await tx.zakatAcademyProfile.create({ data: { userId: user.id, nis: nip, address: input.address, phone: input.phone, gender: input.gender, ...(courseId ? { enrollments: { create: { courseId } } } : {}) } });
    } else {
      await tx.teknisiParticipant.create({ data: { userId: user.id, nip, address: input.address, phone: input.phone } });
      const registration = await tx.module.findUniqueOrThrow({ where: { slug: "teknisi" } });
      await tx.moduleAccess.create({ data: { userId: user.id, moduleId: registration.id, role: "technician" } });
      await tx.teknisiTechnician.create({ data: { userId: user.id, name: input.name, outletId, activeOutletId: outletId, specialty: String(form.get("specialty") ?? "").trim().slice(0, 191) || "Servis HP" } });
    }
    return { userId: user.id, nip };
  });
}

export async function authenticateParticipant(moduleSlug: ParticipantModule, identifier: string, password: string): Promise<SessionPayload | null> {
  if (!identifier || identifier.length > 191 || !password || Buffer.byteLength(password, "utf8") > 72) return null;
  const registration = await prisma.module.findUnique({ where: { slug: moduleSlug }, select: { isActive: true } });
  if (!registration?.isActive) return null;
  const user = moduleSlug === "academy"
    ? await prisma.user.findFirst({ where: { isActive: true, OR: [
      { academyProfile: { nis: identifier.trim().toUpperCase(), deletedAt: null } },
      { email: identifier.trim().toLowerCase(), OR: [{ academyProfile: { deletedAt: null } }, { isSuperadmin: true }, { moduleAccess: { some: { role: "teacher", module: { slug: "academy" } } } }] },
    ] }, include: { moduleAccess: { include: { module: true } } } })
    : await prisma.user.findFirst({ where: { isActive: true, teknisiParticipant: { nip: identifier.trim().toUpperCase(), deletedAt: null } }, include: { moduleAccess: { include: { module: true } } } });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) return null;
  return { userId: user.id, name: user.name, isSuperadmin: user.isSuperadmin, moduleSlugs: user.moduleAccess.filter(access => access.module.isActive).map(access => access.module.slug) };
}
