import { getTransactionStatus } from "@/modules/payment/api/transaction";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const transaction = await getTransactionStatus(params.id);

  if (!transaction) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(transaction);
}