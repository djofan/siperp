import { NextResponse } from "next/server";
import { authenticateParticipant } from "./participant-accounts";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";
import type { ParticipantModule } from "./participant-policy";

export async function participantLogin(request: Request, moduleSlug: ParticipantModule) {
  const body = await request.json().catch(() => null);
  const nip = typeof body?.nip === "string" ? body.nip.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const session = await authenticateParticipant(moduleSlug, nip, password);
  if (!session) return NextResponse.json({ error: "NIP atau password salah, atau akun tidak aktif." }, { status: 401 });
  const response = NextResponse.json({ ok: true, nextPath: moduleSlug === "teknisi" && session.moduleSlugs.includes("teknisi") ? "/teknisi/panel" : moduleSlug === "academy" ? "/academy/lanjut" : "/teknisi/peserta" });
  response.cookies.set(sessionCookieOptions.name, await createSessionToken(session), sessionCookieOptions);
  return response;
}
