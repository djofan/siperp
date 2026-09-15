import { prisma } from "@/lib/prisma";

export async function listPaymentFeeRefs() {
  return prisma.lazsipPaymentFeeRef.findMany({ orderBy: { method: "asc" } });
}

export async function getPaymentFeeRef(method: string) {
  return prisma.lazsipPaymentFeeRef.findUnique({ where: { method } });
}

interface PaymentFeeRefInput {
  method: string;
  feeAmount?: number;
  feePercentage?: number;
}

export async function upsertPaymentFeeRef(input: PaymentFeeRefInput) {
  return prisma.lazsipPaymentFeeRef.upsert({
    where: { method: input.method },
    update: { feeAmount: input.feeAmount, feePercentage: input.feePercentage },
    create: input,
  });
}

export async function deletePaymentFeeRef(id: string) {
  await prisma.lazsipPaymentFeeRef.delete({ where: { id } });
}

export { calculateFee } from "@/modules/lazsip/api/feeCalculation";
