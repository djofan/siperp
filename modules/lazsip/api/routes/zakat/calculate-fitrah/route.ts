import { NextResponse } from "next/server";
import { calculateZakatFitrah } from "@/modules/lazsip/api/zakat";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const jiwaCount = Number(body?.jiwaCount);

  if (!Number.isFinite(jiwaCount) || jiwaCount <= 0) {
    return NextResponse.json({ error: "Jumlah jiwa tidak valid." }, { status: 400 });
  }

  const result = await calculateZakatFitrah(jiwaCount);

  return NextResponse.json(result);
}
