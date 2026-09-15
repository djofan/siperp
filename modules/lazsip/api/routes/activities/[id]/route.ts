import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { updateActivity, deleteActivity } from "@/modules/lazsip/api/activities";

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
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const image = typeof body?.image === "string" && body.image.trim() ? body.image.trim() : undefined;
  const isPinned = Boolean(body?.isPinned);
  const dateValue = typeof body?.date === "string" ? new Date(body.date) : null;

  if (!title || !description || !dateValue || Number.isNaN(dateValue.getTime())) {
    return NextResponse.json({ error: "Judul, deskripsi, dan tanggal wajib diisi." }, { status: 400 });
  }

  await updateActivity(id, { title, description, image, isPinned, date: dateValue });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  await deleteActivity(id);

  return NextResponse.json({ ok: true });
}
