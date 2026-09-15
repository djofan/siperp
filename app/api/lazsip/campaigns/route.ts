import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { createCampaign } from "@/modules/lazsip/campaigns";

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const targetAmount = Number(body?.targetAmount);
  const image = typeof body?.image === "string" && body.image.trim() ? body.image.trim() : undefined;
  const uniqueCode = typeof body?.uniqueCode === "string" ? body.uniqueCode.trim().toUpperCase() : "";
  const isPinned = Boolean(body?.isPinned);
  const status = body?.status === "completed" ? "completed" : "active";

  if (!title || !description || !uniqueCode || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json(
      { error: "Judul, deskripsi, kode unik, dan target nominal (>0) wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const campaign = await createCampaign({
      title,
      description,
      targetAmount,
      image,
      uniqueCode,
      isPinned,
      status,
    });
    return NextResponse.json({ ok: true, id: campaign.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat campaign. Pastikan kode unik belum dipakai." },
      { status: 400 }
    );
  }
}
