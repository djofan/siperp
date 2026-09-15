import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "sip_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 hari

export interface SessionPayload {
  userId: string;
  name: string;
  isSuperadmin: boolean;
  moduleSlugs: string[];
}

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET belum di-set di environment variable.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
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
      isSuperadmin: payload.isSuperadmin,
      moduleSlugs: payload.moduleSlugs as string[],
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
