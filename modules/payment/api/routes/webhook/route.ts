import { markAsPaid, markAsFailed } from "@/modules/payment/api/transaction";
import { verifyMidtransSignature } from "@/modules/payment/api/midtransSignature";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePaymentViews } from "@/modules/lazsip/api/revalidatePaymentViews";

const PAID_STATUSES = new Set(["capture", "settlement"]);
const FAILED_STATUSES = new Set(["expire", "cancel", "deny", "failure"]);

export async function POST(req: NextRequest) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    // Gateway asli belum terpasang (lihat CLAUDE.md §9 / prd-lazsip.md §8) — tolak semua
    // notifikasi webhook selama kunci belum dikonfigurasi, daripada percaya begitu saja.
    console.error("MIDTRANS_SERVER_KEY belum diset — notifikasi webhook ditolak.");
    return NextResponse.json({ error: "Payment gateway belum dikonfigurasi." }, { status: 503 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  if (!verifyMidtransSignature(payload, serverKey)) {
    console.error("Tanda tangan webhook Midtrans tidak valid.", { order_id: payload.order_id });
    return NextResponse.json({ error: "Tanda tangan tidak valid." }, { status: 401 });
  }

  const orderId = payload.order_id;
  const status = payload.transaction_status;
  // "capture" untuk kartu kredit hanya lunas kalau fraud_status accept; status lain
  // (mis. e-wallet/VA) tidak mengirim fraud_status sama sekali.
  const isCaptureAccepted = status !== "capture" || payload.fraud_status === "accept";

  try {
    let transaction;
    if (PAID_STATUSES.has(status) && isCaptureAccepted) {
      transaction = await markAsPaid(orderId);
    } else if (FAILED_STATUSES.has(status) || (status === "capture" && !isCaptureAccepted)) {
      transaction = await markAsFailed(orderId);
    } else {
      // Status transisi (mis. "pending") — belum final, tidak perlu diproses.
      return NextResponse.json({ received: true });
    }

    if (transaction.moduleSource === "lazsip") revalidatePaymentViews();
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Gagal memproses notifikasi webhook", { order_id: orderId, error });
    return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  }
}
