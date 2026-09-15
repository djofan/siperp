import { NextResponse } from "next/server";
import { authenticate } from "@/modules/core/auth";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email dan password wajib diisi." },
      { status: 400 }
    );
  }

  const session = await authenticate(email, password);
  if (!session) {
    return NextResponse.json(
      { error: "Email atau password salah." },
      { status: 401 }
    );
  }

  const token = await createSessionToken(session);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieOptions.name, token, sessionCookieOptions);
  return response;
}
