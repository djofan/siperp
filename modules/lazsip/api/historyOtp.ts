import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const hash = (value: string) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("OTP secret unavailable");
  return createHmac("sha256", secret).update(value).digest("hex");
};

export async function requestHistoryOtp(email: string) {
  const key = hash("history-email:" + email);
  const id = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const digest = hash(id + ":" + code);
  await prisma.$executeRaw`INSERT IGNORE INTO lazsip_history_otp (email_key) VALUES (${key})`;
  const changed = await prisma.$executeRaw`
    UPDATE lazsip_history_otp SET challenge_id=${id}, code_hash=${digest},
      expires_at=DATE_ADD(NOW(3), INTERVAL 10 MINUTE), attempts=0,
      send_count=IF(window_start IS NULL OR window_start < DATE_SUB(NOW(3), INTERVAL 1 HOUR),1,send_count+1),
      window_start=IF(window_start IS NULL OR window_start < DATE_SUB(NOW(3), INTERVAL 1 HOUR),NOW(3),window_start),
      sent_at=NOW(3)
    WHERE email_key=${key} AND (sent_at IS NULL OR sent_at < DATE_SUB(NOW(3), INTERVAL 60 SECOND))
      AND (window_start IS NULL OR window_start < DATE_SUB(NOW(3), INTERVAL 1 HOUR) OR send_count < 5)`;
  if (!changed) return { limited: true as const };
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) throw new Error("Email unavailable");
    // Send to every valid email, regardless of whether it belongs to a donor.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `history-otp/${id}` },
      body: JSON.stringify({ from, to: email, subject: "Kode verifikasi riwayat LAZSIP",
        html: `<p>Kode verifikasi untuk membuka riwayat pembayaran LAZSIP:</p><p style="font-size:28px;font-weight:bold">${code}</p><p>Berlaku 10 menit dan hanya dapat digunakan sekali. Jangan bagikan kode ini. Abaikan email ini jika Anda tidak meminta kode.</p>` }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Email unavailable");
    return { limited: false as const, challengeId: id };
  } catch {
    await prisma.$executeRaw`UPDATE lazsip_history_otp SET code_hash=NULL WHERE email_key=${key} AND challenge_id=${id}`;
    throw new Error("Kode belum dapat dikirim. Coba lagi nanti atau gunakan cek transaksi dengan kode.");
  }
}

export async function verifyHistoryOtp(email: string, id: string, code: string) {
  const key = hash("history-email:" + email);
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ code_hash: string | null; attempts: number; valid: number }>>`
      SELECT code_hash, attempts, (expires_at > NOW(3)) AS valid FROM lazsip_history_otp
      WHERE email_key=${key} AND challenge_id=${id} FOR UPDATE`;
    const row = rows[0];
    if (!row?.code_hash || !row.valid || row.attempts >= 5) return false;
    const matches = timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hash(id + ":" + code)));
    await tx.$executeRaw`UPDATE lazsip_history_otp SET attempts=attempts+1,
      code_hash=${matches ? null : row.code_hash} WHERE email_key=${key}`;
    return matches;
  });
}
