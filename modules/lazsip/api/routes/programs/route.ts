import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { createProgram } from "@/modules/lazsip/api/programs";

const VALID_CATEGORIES = ["umum", "pendidikan", "sarsip"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const requirements =
    typeof body?.requirements === "string" && body.requirements.trim() ? body.requirements.trim() : undefined;
  const image = typeof body?.image === "string" && body.image.trim() ? body.image.trim() : undefined;
  const category = VALID_CATEGORIES.includes(body?.category) ? body.category : "umum";
  const isPinned = Boolean(body?.isPinned);

  if (!title || !description) {
    return NextResponse.json({ error: "Judul dan deskripsi wajib diisi." }, { status: 400 });
  }

  const program = await createProgram({ title, description, requirements, image, category, isPinned });

  return NextResponse.json({ ok: true, id: program.id }, { status: 201 });
}
