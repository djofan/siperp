import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { updatePengurus, deletePengurus } from "@/modules/sip/api/pengurus";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!hasModuleAccess(session, "sip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const position = typeof body?.position === "string" ? body.position.trim() : "";
  const level = typeof body?.level === "string" ? body.level : "tim";
  const photo = typeof body?.photo === "string" && body.photo.trim() ? body.photo.trim() : undefined;
  const order = Number.isFinite(Number(body?.order)) ? Number(body.order) : 0;

  if (!name || !position) {
    return NextResponse.json({ error: "Nama dan jabatan wajib diisi." }, { status: 400 });
  }

  await updatePengurus(id, { name, position, level, photo, order });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!hasModuleAccess(session, "sip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  await deletePengurus(id);
  return NextResponse.json({ ok: true });
}
