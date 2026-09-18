import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function findOrCreateDonor(name: string, phone: string, tx: Prisma.TransactionClient = prisma) {
  // Unique phone also prevents duplicates from simultaneous checkouts. Public callers
  // cannot overwrite an existing person's identity merely by entering their phone.
  return tx.paymentDonor.upsert({
    where: { phone },
    update: {},
    create: { name, phone },
  });
}
