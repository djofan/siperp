import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setModuleActive } from "@/modules/core/modules";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.isSuperadmin) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive wajib boolean." }, { status: 400 });
  }

  try {
    await setModuleActive(id, body.isActive);
  } catch {
    return NextResponse.json({ error: "Gagal mengubah status modul." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
