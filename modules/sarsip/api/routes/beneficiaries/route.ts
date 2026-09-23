import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBeneficiary } from "@/modules/sarsip/api/beneficiaries";

export async function POST(request: Request) {
  if (!hasModuleAccess(await getSession(), "sarsip")) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  let data;
  try { data = parseBeneficiary(body); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  const row = await prisma.sarsipBeneficiary.create({ data });
  revalidatePath("/sarsip", "layout"); revalidatePath("/admin/sarsip", "layout");
  return NextResponse.json({ id: row.id }, { status: 201 });
}
