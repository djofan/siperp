import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "@/lib/session";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function hasModuleAccess(session: SessionPayload | null, moduleSlug: string): boolean {
  if (!session) return false;
  return session.isSuperadmin || session.moduleSlugs.includes(moduleSlug);
}
