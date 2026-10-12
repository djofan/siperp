import type { ParticipantModule } from "../../modules/core/participant-policy";
type Db = typeof import("../../lib/prisma").prisma;
export async function sequenceSnapshot(db: Db) {
  return new Map((await db.participantSequence.findMany()).map(row => [row.moduleSlug as ParticipantModule, row.lastNumber]));
}
export function trackNumber(issued: Map<ParticipantModule, number>, moduleSlug: ParticipantModule, nip: string) { issued.set(moduleSlug, Math.max(issued.get(moduleSlug) ?? 0, Number(nip.slice(3)))); }
export async function cleanupParticipantFixtures(db: Db, users: string[], outlets: string[], before: Map<ParticipantModule, number>, issued: Map<ParticipantModule, number>) {
  await db.$transaction(async tx => {
    const tickets = await tx.teknisiTicket.findMany({ where: { outletId: { in: outlets } }, select: { id: true } });
    const ids = tickets.map(ticket => ticket.id);
    await tx.teknisiEvent.deleteMany({ where: { ticketId: { in: ids } } });
    await tx.teknisiPartUse.deleteMany({ where: { ticketId: { in: ids } } });
    await tx.teknisiTicket.deleteMany({ where: { id: { in: ids } } });
    await tx.teknisiTechnician.deleteMany({ where: { userId: { in: users } } });
    await tx.zakatAcademyProfile.deleteMany({ where: { userId: { in: users } } });
    await tx.teknisiParticipant.deleteMany({ where: { userId: { in: users } } });
    await tx.user.deleteMany({ where: { id: { in: users } } });
    await tx.teknisiOutlet.deleteMany({ where: { id: { in: outlets } } });
    for (const moduleSlug of ["academy", "teknisi"] as const) {
      if (!issued.has(moduleSlug)) continue;
      // Reset only disposable test numbers. Concurrent real registrations, including deleted accounts,
      // prevent this reset; their production counter is never rewound.
      await tx.$queryRaw`SELECT module_slug FROM participant_sequences WHERE module_slug = ${moduleSlug} FOR UPDATE`;
      const base = before.get(moduleSlug) ?? 0;
      const foreign = moduleSlug === "academy"
        ? (await tx.zakatAcademyProfile.findMany({ select: { nis: true } })).some(row => row.nis?.startsWith("PAZ") && Number(row.nis.slice(3)) > base)
        : (await tx.teknisiParticipant.findMany({ select: { nip: true } })).some(row => Number(row.nip.slice(3)) > base);
      if (!foreign) await tx.participantSequence.updateMany({ where: { moduleSlug, lastNumber: issued.get(moduleSlug) }, data: { lastNumber: base } });
    }
  });
}
