import { createCampaignCheckout, DonationValidationError } from "@/modules/lazsip/api/campaignCheckout";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body?.moduleSource !== "lazsip" || body?.sourceType !== "campaign" || body?.fundType !== "infak") {
    return NextResponse.json({ error: "Jenis checkout belum didukung." }, { status: 400 });
  }
  try {
    const transaction = await createCampaignCheckout({
      campaignId: typeof body.sourceId === "string" ? body.sourceId : "",
      donorName: typeof body.donorName === "string" ? body.donorName : "",
      donorPhone: typeof body.donorPhone === "string" ? body.donorPhone : "",
      isAnonymous: body.isAnonymous === true,
      amount: typeof body.amount === "number" ? body.amount : NaN,
      coversFee: body.coversFee !== false,
      paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : "",
    });
    return NextResponse.json({ transactionId: transaction.id }, { status: 201 });
  } catch (error) {
    if (error instanceof DonationValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Gagal membuat checkout donasi", error);
    return NextResponse.json({ error: "Gagal membuat pembayaran. Silakan coba lagi." }, { status: 500 });
  }
}
