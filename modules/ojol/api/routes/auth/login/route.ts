import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authenticateUserId } from "@/modules/core/auth";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";
import { normalizeCode } from "@/modules/ojol/api/policy";

// Login guru/peserta dengan kode akun (prd-ojol §3). Password diverifikasi terhadap akun Core
// dan yang diterbitkan adalah sesi Core yang sama — bukan sistem auth terpisah.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? normalizeCode(body.code) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!code || !password) {
    return NextResponse.json({ error: "Kode akun dan password wajib diisi." }, { status: 400 });
  }

  const member = await prisma.ojolMember.findUnique({
    where: { code },
    select: { role: true, user: { select: { id: true, isActive: true, isSuperadmin: true, passwordHash: true } } },
  });
  const invalid = NextResponse.json({ error: "Kode akun atau password salah." }, { status: 401 });
  if (!member) return invalid;

  const registered = await prisma.module.findUnique({ where: { slug: "ojol" }, select: { isActive: true } });
  if (!registered?.isActive && !member.user.isSuperadmin) {
    return NextResponse.json({ error: "Program belum dibuka. Hubungi admin." }, { status: 403 });
  }

  const session = await authenticateUserId(member.user.id, password);
  if (!session) {
    // Pesan "nonaktif" hanya ditampilkan bila password benar, supaya tidak membocorkan status akun.
    if (!member.user.isActive && (await bcrypt.compare(password, member.user.passwordHash))) {
      return NextResponse.json({ error: "Akun ini nonaktif. Hubungi admin." }, { status: 403 });
    }
    return invalid;
  }

  const response = NextResponse.json({ ok: true, redirectTo: member.role === "guru" ? "/ojol/guru" : "/ojol/peserta" });
  response.cookies.set(sessionCookieOptions.name, await createSessionToken(session), sessionCookieOptions);
  return response;
}
