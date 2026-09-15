import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/modules/lazsip/api/transactionStatus";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!code) {
    return NextResponse.json({ found: false });
  }

  const result = await getTransactionStatus(code);
  return NextResponse.json(result ?? { found: false });
}
