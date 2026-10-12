import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { formatNip, type ParticipantModule } from "./participant-policy";
export async function allocateNip(tx: Prisma.TransactionClient, moduleSlug: ParticipantModule) {
  // The counter row remains locked until the account transaction commits or rolls back.
  await tx.$executeRaw`INSERT INTO participant_sequences (module_slug, last_number) VALUES (${moduleSlug}, 1) ON DUPLICATE KEY UPDATE last_number = last_number + 1`;
  const sequence = await tx.participantSequence.findUniqueOrThrow({ where: { moduleSlug } });
  return formatNip(moduleSlug, sequence.lastNumber);
}
