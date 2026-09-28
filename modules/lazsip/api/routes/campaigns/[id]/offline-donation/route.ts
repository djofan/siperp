import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { createOfflineCampaignDonation, CampaignAdjustmentError } from "@/modules/lazsip/api/campaigns";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const email = typeof body?.email === "string" ? body.email : "";
  const amount = Number(body?.amount);

  try {
    const transaction = await createOfflineCampaignDonation(id, { name, phone, email, amount });
    return NextResponse.json({ ok: true, transactionId: transaction.id });
  } catch (error) {
    if (error instanceof CampaignAdjustmentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
