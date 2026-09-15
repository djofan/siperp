// Fungsi murni, aman dipakai di server maupun client component (tidak import prisma).
export function calculateFee(
  ref: { feeAmount: number | null; feePercentage: number | null } | null | undefined,
  amount: number
): number {
  if (!ref) return 0;
  const flat = ref.feeAmount ?? 0;
  const percentage = ref.feePercentage ? Math.round(amount * (ref.feePercentage / 100)) : 0;
  return flat + percentage;
}
