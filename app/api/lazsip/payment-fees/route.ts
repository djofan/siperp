import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { upsertPaymentFeeRef } from "@/modules/lazsip/paymentFees";

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const method = typeof body?.method === "string" ? body.method.trim() : "";
  const feeAmount = body?.feeAmount === "" || body?.feeAmount === undefined ? undefined : Number(body.feeAmount);
  const feePercentage =
    body?.feePercentage === "" || body?.feePercentage === undefined ? undefined : Number(body.feePercentage);

  if (!method) {
    return NextResponse.json({ error: "Nama metode wajib diisi." }, { status: 400 });
  }

  await upsertPaymentFeeRef({ method, feeAmount, feePercentage });

  return NextResponse.json({ ok: true }, { status: 201 });
}
