import { createTransaction } from "@/modules/payment/api/transaction";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const transaction = await createTransaction({
    moduleSource: body.moduleSource,
    sourceType: body.sourceType,
    sourceId: body.sourceId,
    fundType: body.fundType,
    donorName: body.donorName,
    isAnonymous: body.isAnonymous,
    amount: body.amount,
    paymentMethod: body.paymentMethod,
  });

  return NextResponse.json({ transactionId: transaction.id });
}