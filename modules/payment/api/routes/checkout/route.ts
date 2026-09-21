import { createCampaignCheckout, DonationValidationError } from "@/modules/lazsip/api/campaignCheckout";
import { createZakatCheckout, ZakatValidationError } from "@/modules/lazsip/api/zakatCheckout";
import { isRateLimited, getClientKey } from "@/modules/payment/api/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (isRateLimited(getClientKey(req))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi dalam beberapa saat." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (body?.moduleSource !== "lazsip") {
    return NextResponse.json({ error: "Jenis checkout belum didukung." }, { status: 400 });
  }

  try {
    if (body.sourceType === "campaign" && body.fundType === "infak") {
      const transaction = await createCampaignCheckout({
        campaignId: typeof body.sourceId === "string" ? body.sourceId : "",
        donorName: typeof body.donorName === "string" ? body.donorName : "",
        donorPhone: typeof body.donorPhone === "string" ? body.donorPhone : "",
        donorEmail: typeof body.donorEmail === "string" ? body.donorEmail : "",
        isAnonymous: body.isAnonymous === true,
        amount: typeof body.amount === "number" ? body.amount : NaN,
        coversFee: body.coversFee !== false,
        paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : "",
      });
      return NextResponse.json({ transactionId: transaction.id }, { status: 201 });
    }

    if (body.sourceType === "zakat" && body.fundType === "zakat") {
      const zakatType = body.zakatType === "fitrah" ? "fitrah" : "maal";
      const transaction = await createZakatCheckout({
        donorName: typeof body.donorName === "string" ? body.donorName : "",
        donorPhone: typeof body.donorPhone === "string" ? body.donorPhone : "",
        donorEmail: typeof body.donorEmail === "string" ? body.donorEmail : "",
        isAnonymous: body.isAnonymous === true,
        amount: typeof body.amount === "number" ? body.amount : NaN,
        zakatType,
        goldPriceSnapshot: typeof body.goldPriceSnapshot === "number" ? body.goldPriceSnapshot : undefined,
        jiwaCount: typeof body.jiwaCount === "number" ? body.jiwaCount : undefined,
        coversFee: body.coversFee !== false,
        paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : "",
      });
      return NextResponse.json({ transactionId: transaction.id }, { status: 201 });
    }

    return NextResponse.json({ error: "Jenis checkout belum didukung." }, { status: 400 });
  } catch (error) {
    if (error instanceof DonationValidationError || error instanceof ZakatValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Gagal membuat checkout pembayaran", error);
    return NextResponse.json({ error: "Gagal membuat pembayaran. Silakan coba lagi." }, { status: 500 });
  }
}
