import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBeneficiary } from "@/modules/sarsip/api/beneficiaries";
type Context = { params: Promise<{ id: string }> };
function refresh() { revalidatePath("/sarsip", "layout"); revalidatePath("/admin/sarsip", "layout"); }
export async function PUT(request: Request, { params }: Context) {
  if (!hasModuleAccess(await getSession(), "sarsip")) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  let data;
  try { data = parseBeneficiary(body); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  const result = await prisma.sarsipBeneficiary.updateMany({ where: { id, archivedAt: null }, data });
  if (!result.count) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  refresh(); return NextResponse.json({ ok: true });
}
export async function DELETE(_request: Request, { params }: Context) {
  if (!hasModuleAccess(await getSession(), "sarsip")) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  const { id } = await params;
  const result = await prisma.sarsipBeneficiary.updateMany({ where: { id, archivedAt: null }, data: { archivedAt: new Date() } });
  if (!result.count) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  refresh(); return NextResponse.json({ ok: true });
}
