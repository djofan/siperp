import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { updateProgram, deleteProgram } from "@/modules/lazsip/api/programs";

const VALID_TYPES = ["berita", "daftar"];

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
  const type = VALID_TYPES.includes(body?.type) ? body.type : "berita";
  const requirements =
    type === "daftar" && typeof body?.requirements === "string" && body.requirements.trim()
      ? body.requirements.trim()
      : null;
  const image = typeof body?.image === "string" && body.image.trim() ? body.image.trim() : undefined;
  const formUrl =
    type === "daftar" && typeof body?.formUrl === "string" && body.formUrl.trim() ? body.formUrl.trim() : null;
  const isPinned = Boolean(body?.isPinned);

  if (!title || !description) {
    return NextResponse.json({ error: "Judul dan deskripsi wajib diisi." }, { status: 400 });
  }

  if (type === "daftar" && !formUrl) {
    return NextResponse.json({ error: "Link pendaftaran wajib diisi untuk tipe pendaftaran." }, { status: 400 });
  }

  await updateProgram(id, { title, description, requirements, image, type, formUrl, isPinned });

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
  await deleteProgram(id);

  return NextResponse.json({ ok: true });
}
