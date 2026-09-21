import { createCampaignCheckout, DonationValidationError } from "@/modules/lazsip/api/campaignCheckout";
import { createSarsipCheckout } from "@/modules/sarsip/api/checkout";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const supported = (body?.moduleSource === "lazsip" && body?.fundType === "infak") ||
    (body?.moduleSource === "sarsip" && body?.fundType === "donasi");
  if (!supported || body?.sourceType !== "campaign") {
    return NextResponse.json({ error: "Jenis checkout belum didukung." }, { status: 400 });
  }
  try {
    const checkout = body.moduleSource === "sarsip" ? createSarsipCheckout : createCampaignCheckout;
    const transaction = await checkout({
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
