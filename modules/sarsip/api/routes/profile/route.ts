import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function PUT(request: Request) {
  if (!hasModuleAccess(await getSession(), "sarsip")) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const headline = typeof body?.headline === "string" ? body.headline.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const contact = typeof body?.contact === "string" ? body.contact.trim() : "";
  if (!headline || headline.length > 191 || !description || description.length > 10000 || contact.length > 191) {
    return NextResponse.json({ error: "Judul dan deskripsi wajib diisi. Judul/kontak maksimal 191 karakter." }, { status: 400 });
  }
  const data = { headline, description, contact: contact || null };
  await prisma.sarsipProfile.upsert({ where: { id: "main" }, update: data, create: { id: "main", ...data } });
  revalidatePath("/sarsip", "layout"); revalidatePath("/admin/sarsip", "layout");
  return NextResponse.json({ ok: true });
}

