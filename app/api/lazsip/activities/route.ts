import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { createActivity } from "@/modules/lazsip/activities";

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const image = typeof body?.image === "string" && body.image.trim() ? body.image.trim() : undefined;
  const isPinned = Boolean(body?.isPinned);
  const dateValue = typeof body?.date === "string" ? new Date(body.date) : null;

  if (!title || !description || !dateValue || Number.isNaN(dateValue.getTime())) {
    return NextResponse.json({ error: "Judul, deskripsi, dan tanggal wajib diisi." }, { status: 400 });
  }

  const activity = await createActivity({ title, description, image, isPinned, date: dateValue });

  return NextResponse.json({ ok: true, id: activity.id }, { status: 201 });
}
