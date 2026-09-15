import { NextResponse } from "next/server";
import { calculateZakat } from "@/modules/lazsip/api/zakat";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const hartaAmount = Number(body?.hartaAmount);

  if (!Number.isFinite(hartaAmount) || hartaAmount < 0) {
    return NextResponse.json({ error: "Nominal harta tidak valid." }, { status: 400 });
  }

  const result = await calculateZakat(hartaAmount);

  return NextResponse.json(result);
}
