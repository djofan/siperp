import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSnap, safeCheckoutUrl, midtransConfig } from "@/modules/payment/api/midtrans";
import { getClientKey, isRateLimited } from "@/modules/payment/api/rateLimit";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (isRateLimited(getClientKey(request))) return NextResponse.json({ error: "Coba lagi beberapa saat." }, { status: 429 });
  const { id } = await params;
  const transaction = await prisma.paymentTransaction.findUnique({ where: { id } });
  if (!transaction) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  if (transaction.gateway !== "midtrans_sandbox" || transaction.status !== "pending") return NextResponse.json({ error: "Transaksi tidak dapat dibayar melalui Midtrans." }, { status: 409 });
  if (safeCheckoutUrl(transaction.gatewayCheckoutUrl)) return NextResponse.json({ url: transaction.gatewayCheckoutUrl });
  try { midtransConfig(); } catch { return NextResponse.json({ error: "Konfigurasi Midtrans sandbox belum lengkap." }, { status: 503 }); }
  // Claim once across all server processes. Never retry an ambiguous remote create:
  // timeout can mean Midtrans created a session even when this server saw no response.
  const claimed = await prisma.paymentTransaction.updateMany({ where: { id, gateway: "midtrans_sandbox", status: "pending", gatewayState: "not_started" }, data: { gatewayState: "creating" } });
  if (!claimed.count) return NextResponse.json({ error: "Sesi sedang diproses atau perlu diperiksa admin. Jangan membuat transaksi ulang." }, { status: 409 });
  try {
    const result = await createSnap(transaction);
    await prisma.paymentTransaction.updateMany({ where: { id, status: "pending", gatewayState: "creating" }, data: { gatewayCheckoutUrl: result.url, gatewayState: "ready" } });
    return NextResponse.json({ url: result.url });
  } catch {
    await prisma.paymentTransaction.updateMany({ where: { id, gatewayState: "creating" }, data: { gatewayState: "needs_review" } });
    return NextResponse.json({ error: "Sesi belum dapat dipastikan. Hubungi admin dengan kode transaksi ini; jangan membuat pembayaran ulang." }, { status: 502 });
  }
}
