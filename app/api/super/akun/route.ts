import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createUserWithAccess } from "@/modules/core/users";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isSuperadmin) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const isSuperadmin = Boolean(body?.isSuperadmin);
  const moduleIds: string[] = Array.isArray(body?.moduleIds) ? body.moduleIds : [];

  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: "Nama, email wajib diisi, dan password minimal 8 karakter." },
      { status: 400 }
    );
  }

  try {
    await createUserWithAccess({
      name,
      email,
      password,
      isSuperadmin,
      moduleIds: isSuperadmin ? [] : moduleIds,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat akun. Pastikan email belum dipakai." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
