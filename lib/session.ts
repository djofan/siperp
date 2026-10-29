export const SESSION_COOKIE_NAME = "sip_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 hari

export interface SessionPayload {
  userId: string;
  name: string;
  code?: string;
  isSuperadmin: boolean;
  moduleSlugs: string[];
  moduleRoles?: Record<string, string>;
  panelRedirect?: string | null;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const base = process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000/api/v1";
    const response = await fetch(`${base.replace(/\/$/, "")}/auth/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    if (!response.ok) return null;
    const { data: payload } = await response.json();
    if (
      typeof payload.userId !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.isSuperadmin !== "boolean" ||
      !Array.isArray(payload.moduleSlugs)
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      name: payload.name,
      code: payload.code,
      isSuperadmin: payload.isSuperadmin,
      moduleSlugs: payload.moduleSlugs as string[],
      moduleRoles: payload.moduleRoles,
      panelRedirect: payload.panelRedirect,
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};
