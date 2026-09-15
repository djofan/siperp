import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { createProgramBantuan, slugify } from "@/modules/sip/api/programBantuan";

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasModuleAccess(session, "sip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const slug = typeof body?.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(title);
  const image = typeof body?.image === "string" && body.image.trim() ? body.image.trim() : undefined;
  const campaignUrl = typeof body?.campaignUrl === "string" && body.campaignUrl.trim() ? body.campaignUrl.trim() : undefined;
  const isPinned = Boolean(body?.isPinned);

  if (!title || !description || !slug) {
    return NextResponse.json({ error: "Judul, deskripsi, dan slug wajib diisi." }, { status: 400 });
  }

  try {
    const program = await createProgramBantuan({ title, slug, description, image, campaignUrl, isPinned });
    return NextResponse.json({ ok: true, id: program.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan program. Pastikan slug belum dipakai program lain." }, { status: 400 });
  }
}
