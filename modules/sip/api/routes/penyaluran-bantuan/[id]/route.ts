import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { updatePenyaluranBantuan, deletePenyaluranBantuan } from "@/modules/sip/api/penyaluranBantuan";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!hasModuleAccess(session, "sip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const image = typeof body?.image === "string" && body.image.trim() ? body.image.trim() : undefined;
  const location = typeof body?.location === "string" && body.location.trim() ? body.location.trim() : undefined;
  const dateRaw = typeof body?.date === "string" ? new Date(body.date) : null;

  if (!title || !description || !dateRaw || Number.isNaN(dateRaw.getTime())) {
    return NextResponse.json({ error: "Judul, deskripsi, dan tanggal wajib diisi." }, { status: 400 });
  }

  await updatePenyaluranBantuan(id, { title, description, image, location, date: dateRaw });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!hasModuleAccess(session, "sip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  await deletePenyaluranBantuan(id);
  return NextResponse.json({ ok: true });
}
