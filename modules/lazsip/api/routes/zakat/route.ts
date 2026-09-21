import { NextResponse } from "next/server";
import { createZakatPayment } from "@/modules/lazsip/api/zakat";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const donorNameRaw = typeof body?.donorName === "string" ? body.donorName.trim() : "";
  const zakatType = body?.zakatType === "fitrah" ? "fitrah" : "maal";
  const amount = Number(body?.amount);
  const goldPriceSnapshot = Number(body?.goldPriceSnapshot);
  const jiwaCount = Number(body?.jiwaCount);
  // Checkbox "tanggung biaya admin" default TERCENTANG — hanya lepas kalau donatur eksplisit
  // mengirim coversFee: false. Lihat CLAUDE.md §7 aturan #4 (berlaku juga untuk zakat).
  const coversFee = body?.coversFee === false ? false : true;
  const isAnonymous = Boolean(body?.isAnonymous);
  const paymentMethod = typeof body?.paymentMethod === "string" ? body.paymentMethod : "";

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Nominal zakat tidak valid." }, { status: 400 });
  }
  if (!paymentMethod) {
    return NextResponse.json({ error: "Metode pembayaran wajib dipilih." }, { status: 400 });
  }

  const donorName = isAnonymous ? "Hamba Allah" : donorNameRaw || "Hamba Allah";

  const payment = await createZakatPayment({
    donorName,
    zakatType,
    amount,
    coversFee,
    isAnonymous,
    goldPriceSnapshot: Number.isFinite(goldPriceSnapshot) ? goldPriceSnapshot : undefined,
    jiwaCount: Number.isFinite(jiwaCount) ? jiwaCount : undefined,
    paymentMethod,
  });

  return NextResponse.json({ ok: true, id: payment.id }, { status: 201 });
}
