import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { setCampaignStatus } from "@/modules/lazsip/api/campaigns";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body?.status !== "active" && body?.status !== "completed") {
    return NextResponse.json({ error: "status wajib \"active\" atau \"completed\"." }, { status: 400 });
  }

  await setCampaignStatus(id, body.status);

  return NextResponse.json({ ok: true });
}
