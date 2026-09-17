import { markAsPaid } from "@/modules/payment/api/transaction";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // TODO: verifikasi signature Midtrans di sini sebelum percaya payload ini
  if (payload.transaction_status === "settlement") {
    await markAsPaid(payload.order_id);
  }

  return NextResponse.json({ received: true });
}