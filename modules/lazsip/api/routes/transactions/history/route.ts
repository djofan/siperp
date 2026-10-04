import { NextResponse } from "next/server";
import { getDonorTransactionHistory } from "@/modules/lazsip/api/transactionHistory";
import { prisma } from "@/lib/prisma";
import { normalizeDonorEmail } from "@/modules/payment/api/donorIdentity";
import { isRateLimited, getClientKey } from "@/modules/payment/api/rateLimit";
import { requestHistoryOtp, verifyHistoryOtp } from "@/modules/lazsip/api/historyOtp";

export async function POST(request: Request) {
  if (isRateLimited("history:" + getClientKey(request))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam beberapa saat." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const email = normalizeDonorEmail(typeof body?.email === "string" ? body.email : "");
  if (!email) return NextResponse.json({ error: "Masukkan alamat email yang valid." }, { status: 400 });
  try {
    if (body?.action === "request") {
      const result = await requestHistoryOtp(email);
      if (result.limited) return NextResponse.json({ error: "Tunggu 60 detik sebelum meminta ulang. Maksimal 5 kode per jam." }, { status: 429 });
      return NextResponse.json({ challengeId: result.challengeId, message: "Kode verifikasi telah dikirim. Periksa inbox atau spam." }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body?.action !== "verify" || typeof body.challengeId !== "string" || typeof body.code !== "string"
      || !/^\d{6}$/.test(body.code) || !await verifyHistoryOtp(email, body.challengeId, body.code)) {
      return NextResponse.json({ error: "Kode tidak valid, sudah digunakan, atau kedaluwarsa. Maksimal 5 percobaan per kode." }, { status: 401 });
    }
    const donor = await prisma.paymentDonor.findUnique({ where: { email }, select: { id: true } });
    const items = donor ? await getDonorTransactionHistory(donor.id, false) : [];
    // Omit donor identity, tracking codes and checkout credentials.
    return NextResponse.json({ items: items.map(({ type, label, amount, status, createdAt }) => ({
      type, label, amount, status, createdAt,
    })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: body?.action === "request" ? "Kode belum dapat dikirim. Coba lagi nanti atau gunakan cek transaksi dengan kode." : "Riwayat belum dapat dimuat. Silakan minta kode baru." }, { status: 500 });
  }
}
