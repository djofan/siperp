import { verifyMidtransSignature } from "@/modules/payment/api/midtransSignature";
import { midtransConfig } from "@/modules/payment/api/midtrans";
import { syncMidtrans } from "@/modules/payment/api/syncMidtrans";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let config;
  try { config = midtransConfig(); } catch { return NextResponse.json({ error: "Gateway belum dikonfigurasi." }, { status: 503 }); }
  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  if (!verifyMidtransSignature(payload, config.key)) return NextResponse.json({ error: "Tanda tangan tidak valid." }, { status: 401 });
  try {
    await syncMidtrans(payload.order_id);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Notifikasi belum dapat diverifikasi." }, { status: 503 });
  }
}
