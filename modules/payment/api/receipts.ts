import { prisma } from "@/lib/prisma";
import type { PaymentTransaction, Prisma } from "@/generated/prisma/client";
import { receiptTemplate } from "./receiptTemplate";

// Store the recipient and message once, in the same DB transaction as settlement.
export async function queueReceipt(tx: Prisma.TransactionClient, payment: PaymentTransaction) {
  if (payment.status !== "paid" || !payment.paidAt || !["lazsip", "sarsip"].includes(payment.moduleSource)) return;
  const donor = await tx.paymentDonor.findUniqueOrThrow({ where: { id: payment.donorId } });
  if (!donor.email) return;
  let label = "Donasi";
  if (payment.sourceType === "zakat") {
    const detail = await tx.lazsipZakatDetail.findUnique({ where: { id: payment.sourceId } });
    label = detail ? (detail.zakatType === "fitrah" ? "Zakat Fitrah" : "Zakat Maal") : "Zakat";
  } else if (payment.moduleSource === "sarsip") {
    label = (await tx.sarsipEntry.findUnique({ where: { id: payment.sourceId }, select: { title: true } }))?.title ?? "Donasi SARSIP";
  } else {
    label = (await tx.lazsipCampaign.findUnique({ where: { id: payment.sourceId }, select: { title: true } }))?.title ?? "Donasi LAZSIP";
  }
  const content = receiptTemplate({ ...payment, paidAt: payment.paidAt, donorName: donor.name, label });
  await tx.paymentReceipt.upsert({ where: { transactionId: payment.id }, update: {}, create: { transactionId: payment.id, recipient: donor.email, ...content } });
}

export async function deliverReceipt(transactionId: string, send: typeof fetch = fetch) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return; // Keep queued until configuration is available.
  const now = new Date();
  const receipt = await prisma.paymentReceipt.findUnique({ where: { transactionId } });
  if (!receipt || ["sent", "needs_review"].includes(receipt.status) || receipt.nextAttemptAt > now || (receipt.lockedUntil && receipt.lockedUntil > now)) return;
  // Resend retains idempotency keys for 24h. Stop ambiguous retries before expiry.
  if (receipt.firstAttemptAt && now.getTime() - receipt.firstAttemptAt.getTime() >= 23 * 3600000) {
    await prisma.paymentReceipt.updateMany({ where: { id: receipt.id, status: { not: "sent" }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] }, data: { status: "needs_review", lastError: "Periksa log Resend sebelum mencoba kirim ulang." } });
    return;
  }
  const claim = await prisma.paymentReceipt.updateMany({
    where: { id: receipt.id, status: { in: ["pending", "retry", "sending"] }, attempts: receipt.attempts, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] },
    data: { status: "sending", lockedUntil: new Date(now.getTime() + 60000), attempts: { increment: 1 }, firstAttemptAt: receipt.firstAttemptAt ?? now, sender: receipt.sender ?? from },
  });
  if (!claim.count) return;
  try {
    const response = await send("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `payment-receipt/${receipt.id}` },
      body: JSON.stringify({ from: receipt.sender ?? from, to: receipt.recipient, subject: receipt.subject, html: receipt.html, text: receipt.text }),
    });
    if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
    const result = await response.json();
    if (typeof result.id !== "string") throw new Error("Respons Resend tidak valid");
    await prisma.paymentReceipt.update({ where: { id: receipt.id }, data: { status: "sent", sentAt: new Date(), providerId: result.id, lockedUntil: null, lastError: null } });
  } catch (error) {
    await prisma.paymentReceipt.updateMany({ where: { id: receipt.id, status: "sending" }, data: { status: "retry", lockedUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(receipt.attempts, 6))), lastError: error instanceof Error && error.message.startsWith("Resend HTTP") ? error.message : "Pengiriman belum dapat dipastikan; akan dicoba ulang dengan kunci yang sama." } });
  }
}

export async function tryDeliverReceipt(transactionId: string) {
  try { await deliverReceipt(transactionId); } catch { console.error("Pengiriman receipt tertunda", { transactionId }); }
}

export async function retryReceipts() {
  const rows = await prisma.paymentReceipt.findMany({ where: { status: { in: ["pending", "retry", "sending"] }, nextAttemptAt: { lte: new Date() }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: new Date() } }] }, orderBy: { createdAt: "asc" }, take: 50, select: { transactionId: true } });
  for (const row of rows) await tryDeliverReceipt(row.transactionId);
  return rows.length;
}
