import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { updateLaporan, deleteLaporan } from "@/modules/sip/api/laporan";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!hasModuleAccess(session, "sip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const type = body?.type === "tahunan" ? "tahunan" : "bulanan";
  const periodMonth = Number(body?.periodMonth);
  const periodYear = Number(body?.periodYear);
  const fileUrl = typeof body?.fileUrl === "string" ? body.fileUrl.trim() : "";

  if (!title || !fileUrl || !Number.isFinite(periodYear)) {
    return NextResponse.json({ error: "Judul, periode tahun, dan tautan/file wajib diisi." }, { status: 400 });
  }
  if (type === "bulanan" && (!Number.isFinite(periodMonth) || periodMonth < 1 || periodMonth > 12)) {
    return NextResponse.json({ error: "Bulan wajib diisi (1-12) untuk laporan bulanan." }, { status: 400 });
  }

  await updateLaporan(id, {
    title,
    type,
    periodMonth: type === "bulanan" ? periodMonth : undefined,
    periodYear,
    fileUrl,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!hasModuleAccess(session, "sip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  await deleteLaporan(id);
  return NextResponse.json({ ok: true });
}
