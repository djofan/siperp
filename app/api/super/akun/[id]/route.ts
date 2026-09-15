import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateUser, deleteUser } from "@/modules/core/users";

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
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" && body.password.length > 0 ? body.password : undefined;

  if (!name || !email) {
    return NextResponse.json({ error: "Nama dan email wajib diisi." }, { status: 400 });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
  }

  try {
    await updateUser(id, { name, email, password });
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui akun. Pastikan email belum dipakai akun lain." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.isSuperadmin) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.userId) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun yang sedang dipakai untuk login." },
      { status: 400 }
    );
  }

  try {
    await deleteUser(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus akun.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
