import { getTransactionStatus } from "@/modules/payment/api/transaction";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const transaction = await getTransactionStatus(id);

  if (!transaction) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(transaction, { headers: { "Cache-Control": "no-store" } });
}
