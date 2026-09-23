import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMidtrans } from "@/modules/payment/api/syncMidtrans";
import { getTransactionStatus } from "@/modules/payment/api/transaction";
import { getClientKey, isRateLimited } from "@/modules/payment/api/rateLimit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (isRateLimited(getClientKey(req))) return NextResponse.json({ error: "Coba lagi beberapa saat." }, { status: 429 });
  const { id } = await params;
  const transaction = await prisma.paymentTransaction.findUnique({ where: { id } });
  if (!transaction || transaction.gateway !== "midtrans_sandbox" || !transaction.midtransOrderId) return NextResponse.json({ error: "Transaksi gateway tidak ditemukan." }, { status: 404 });
  try {
    await syncMidtrans(transaction.midtransOrderId);
    return NextResponse.json(await getTransactionStatus(id), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Status belum dapat diverifikasi. Coba lagi nanti." }, { status: 502 });
  }
}
