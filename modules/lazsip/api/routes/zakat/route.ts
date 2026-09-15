import { NextResponse } from "next/server";
import { createZakatPayment } from "@/modules/lazsip/api/zakat";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const donorNameRaw = typeof body?.donorName === "string" ? body.donorName.trim() : "";
  const zakatType = body?.zakatType === "fitrah" ? "fitrah" : "maal";
  const amount = Number(body?.amount);
  const goldPriceSnapshot = Number(body?.goldPriceSnapshot);
  const jiwaCount = Number(body?.jiwaCount);
  const paymentMethod = typeof body?.paymentMethod === "string" ? body.paymentMethod : "";

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Nominal zakat tidak valid." }, { status: 400 });
  }
  if (!paymentMethod) {
    return NextResponse.json({ error: "Metode pembayaran wajib dipilih." }, { status: 400 });
  }

  const payment = await createZakatPayment({
    donorName: donorNameRaw || "Hamba Allah",
    zakatType,
    amount,
    goldPriceSnapshot: Number.isFinite(goldPriceSnapshot) ? goldPriceSnapshot : undefined,
    jiwaCount: Number.isFinite(jiwaCount) ? jiwaCount : undefined,
    paymentMethod,
  });

  return NextResponse.json({ ok: true, id: payment.id }, { status: 201 });
}
