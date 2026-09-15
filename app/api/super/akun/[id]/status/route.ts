import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setUserActive } from "@/modules/core/users";

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
    await setUserActive(id, body.isActive);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah status akun.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
