import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { createCampaignAdjustment } from "@/modules/lazsip/api/campaigns";

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
  const amount = Number(body?.amount);
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!Number.isFinite(amount) || amount === 0 || !note) {
    return NextResponse.json(
      { error: "Nominal (tidak boleh 0) dan catatan wajib diisi." },
      { status: 400 }
    );
  }

  await createCampaignAdjustment(id, amount, note);
  return NextResponse.json({ ok: true });
}
