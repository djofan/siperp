import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { createNews } from "@/modules/lazsip/api/news";

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const image = typeof body?.image === "string" && body.image.trim() ? body.image.trim() : undefined;
  const isPinned = Boolean(body?.isPinned);
  const status = body?.status === "published" ? "published" : "draft";

  if (!title || !content) {
    return NextResponse.json({ error: "Judul dan isi wajib diisi." }, { status: 400 });
  }

  const news = await createNews({ title, content, image, isPinned, status });

  return NextResponse.json({ ok: true, id: news.id }, { status: 201 });
}
