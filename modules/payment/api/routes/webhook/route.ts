import { markAsPaid } from "@/modules/payment/api/transaction";
import { NextRequest, NextResponse } from "next/server";
import { revalidateSourcePaymentViews } from "@/modules/payment/api/revalidate";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  // TODO: verifikasi signature Midtrans di sini sebelum percaya payload ini
  if (payload.transaction_status === "settlement") {
    const transaction = await markAsPaid(payload.order_id);
    revalidateSourcePaymentViews(transaction.moduleSource);
  }

  return NextResponse.json({ received: true });
}
