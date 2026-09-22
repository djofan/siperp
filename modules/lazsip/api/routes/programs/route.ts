import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { createProgram } from "@/modules/lazsip/api/programs";

const VALID_CATEGORIES = ["umum", "pendidikan", "sarsip"];
const VALID_TYPES = ["berita", "daftar"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (body?.category !== undefined && !VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Kategori program tidak valid." }, { status: 400 });
  }
  const category = body?.category;
  const type = VALID_TYPES.includes(body?.type) ? body.type : "berita";
  const requirements =
    typeof body?.requirements === "string" && body.requirements.trim()
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

  const program = await createProgram({ title, description, requirements, image, category, type, formUrl, isPinned });

  return NextResponse.json({ ok: true, id: program.id }, { status: 201 });
}
