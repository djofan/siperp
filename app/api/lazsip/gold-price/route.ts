import { NextResponse } from "next/server";
import { getGoldQuote } from "@/modules/lazsip/api/goldPrice";
export async function GET() {
  const quote = await getGoldQuote();
  return NextResponse.json({ quote }, { status: quote ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
