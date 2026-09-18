import { markAsPaid } from "@/modules/payment/api/transaction";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePaymentViews } from "@/modules/lazsip/api/revalidatePaymentViews";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // TODO: verifikasi signature Midtrans di sini sebelum percaya payload ini
  if (payload.transaction_status === "settlement") {
    const transaction = await markAsPaid(payload.order_id);
    if (transaction.moduleSource === "lazsip") revalidatePaymentViews();
  }

  return NextResponse.json({ received: true });
}
