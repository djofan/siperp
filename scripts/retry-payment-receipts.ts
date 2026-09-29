import "dotenv/config";
import { retryReceipts } from "../modules/payment/api/receipts";
import { prisma } from "../lib/prisma";

async function main() {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new Error("Isi RESEND_API_KEY dan RESEND_FROM_EMAIL terlebih dahulu.");
  console.log(`Antrean email diproses: ${await retryReceipts()}`);
}
main().catch(() => { console.error("Pemrosesan email gagal. Periksa konfigurasi dan database."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
