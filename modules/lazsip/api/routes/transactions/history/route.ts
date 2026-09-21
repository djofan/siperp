import { NextResponse } from "next/server";
import { sendHistoryIfFound } from "@/modules/lazsip/api/transactionHistory";
import { isRateLimited, getClientKey } from "@/modules/payment/api/rateLimit";

const NEUTRAL_MESSAGE = "Kalau email ini terdaftar, riwayat transaksi akan segera dikirimkan ke email tersebut.";

// Rate-limited (prd-lazsip.md §7). Respons SELALU sama persis terlepas dari email itu
// terdaftar atau tidak — lihat sendHistoryIfFound untuk alasannya.
export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam beberapa saat." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";

  // Sengaja TIDAK di-await: kalau ditunggu, waktu respons endpoint ini bakal beda antara
  // email yang ketemu (lebih banyak query + kirim email) vs tidak ketemu (satu query cepat)
  // — itu sendiri jadi celah buat menebak email terdaftar lewat selisih waktu respons.
  if (email.trim()) {
    void sendHistoryIfFound(email).catch((error) => console.error("Gagal memproses cek riwayat", error));
  }

  return NextResponse.json({ message: NEUTRAL_MESSAGE });
}
