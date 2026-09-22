import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/modules/lazsip/api/transactionStatus";
import { isRateLimited, getClientKey } from "@/modules/payment/api/rateLimit";

// Rate-limited (prd-lazsip.md §7) — cegah brute-force nebak kode pelacakan orang lain.
export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam beberapa saat." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!code) {
    return NextResponse.json({ found: false });
  }

  const result = await getTransactionStatus(code);
  return NextResponse.json(result ?? { found: false });
}
