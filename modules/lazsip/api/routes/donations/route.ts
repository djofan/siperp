import { NextResponse } from "next/server";
import { getCampaignById } from "@/modules/lazsip/api/campaigns";
import { createDonation } from "@/modules/lazsip/api/donations";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : "";
  const donorNameRaw = typeof body?.donorName === "string" ? body.donorName.trim() : "";
  const amount = Number(body?.amount);
  // Checkbox "tanggung biaya admin" default TERCENTANG — hanya lepas kalau donatur eksplisit
  // mengirim coversFee: false. Lihat CLAUDE.md §7 aturan #4.
  const coversFee = body?.coversFee === false ? false : true;
  const isAnonymous = Boolean(body?.isAnonymous);
  const paymentMethod = typeof body?.paymentMethod === "string" ? body.paymentMethod : "";

  const campaign = await getCampaignById(campaignId);
  if (!campaign || campaign.status !== "active") {
    return NextResponse.json({ error: "Campaign tidak ditemukan atau sudah selesai." }, { status: 404 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Nominal donasi tidak valid." }, { status: 400 });
  }
  if (!paymentMethod) {
    return NextResponse.json({ error: "Metode pembayaran wajib dipilih." }, { status: 400 });
  }

  const donorName = isAnonymous ? "Hamba Allah" : donorNameRaw || "Hamba Allah";

  const donation = await createDonation({
    campaignId,
    donorName,
    amount,
    coversFee,
    isAnonymous,
    paymentMethod,
  });

  return NextResponse.json({ ok: true, id: donation.id }, { status: 201 });
}
