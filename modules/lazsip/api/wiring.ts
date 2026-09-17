import { registerConfirmationHandler } from "@/modules/payment/api/registry";
import { prisma } from "@/lib/prisma";

registerConfirmationHandler("lazsip", async (trx) => {
  if (trx.sourceType !== "campaign") return;
  await prisma.lazsipCampaign.update({
    where: { id: trx.sourceId },
    data: { currentAmount: { increment: trx.amount } },
  });
});