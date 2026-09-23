import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEntry } from "@/modules/sarsip/api/validation";

export async function POST(request: Request) {
  if (!hasModuleAccess(await getSession(), "sarsip")) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  let data;
  try { data = parseEntry(body); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  const entry = await prisma.sarsipEntry.create({ data });
  revalidatePath("/sarsip", "layout");
  revalidatePath("/admin/sarsip", "layout");
  return NextResponse.json({ id: entry.id }, { status: 201 });
}

