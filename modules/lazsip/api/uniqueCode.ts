// Fungsi murni, aman dipakai di server maupun client component (tidak import prisma) —
// sama seperti feeCalculation.ts.

export const UNIQUE_CODE_LENGTH = 2;

export function isValidUniqueCode(code: string): boolean {
  return new RegExp(`^\\d{${UNIQUE_CODE_LENGTH}}$`).test(code);
}

/**
 * Nominal donasi dibulatkan ke atas ke kelipatan terdekat sesuai panjang kode unik, lalu
 * kode ditempel di digit paling belakang — supaya total akhir yang harus dibayar SELALU
 * >= nominal yang diketik donatur (tidak pernah dikurangi), dan digit belakangnya selalu
 * cocok dengan kode unik campaign untuk memudahkan rekonsiliasi transfer di rekening
 * bersama (lihat prd-lazsip.md §3.4 & §6 aturan #1).
 */
export function applyUniqueCode(amount: number, code: string): number {
  const modulus = 10 ** code.length;
  const remainder = amount % modulus;
  const rounded = remainder === 0 ? amount : amount + (modulus - remainder);
  return rounded + Number(code);
}
