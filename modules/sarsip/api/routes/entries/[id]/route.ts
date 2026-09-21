import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEntry } from "@/modules/sarsip/api/validation";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasModuleAccess(await getSession(), "sarsip")) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  const { id } = await params;
  const existing = await prisma.sarsipEntry.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Konten tidak ditemukan." }, { status: 404 });
  const body = await request.json().catch(() => null);
  let data;
  try { data = parseEntry({ ...body, kind: existing.kind }); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  await prisma.sarsipEntry.update({ where: { id }, data });
  revalidatePath("/sarsip", "layout"); revalidatePath("/admin/sarsip", "layout");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasModuleAccess(await getSession(), "sarsip")) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  const { id } = await params;
  // Archive rather than remove campaign IDs referenced by payment records.
  const changed = await prisma.sarsipEntry.updateMany({ where: { id }, data: { status: "archived" } });
  if (!changed.count) return NextResponse.json({ error: "Konten tidak ditemukan." }, { status: 404 });
  revalidatePath("/sarsip", "layout"); revalidatePath("/admin/sarsip", "layout");
  return NextResponse.json({ ok: true });
}

