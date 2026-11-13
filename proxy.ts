import { NextResponse, type NextRequest } from "next/server";
import { academySurfaceHeader, canonicalAcademyPath, isAcademyAppPath } from "@/modules/academy/pwa/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const config = {
  matcher: ["/admin/:path*", "/academy/:path*", "/academy-app/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/academy" || pathname.startsWith("/academy/") || isAcademyAppPath(pathname)) {
    const forwarded = new Headers(request.headers);
    const app = isAcademyAppPath(pathname);
    // Derive the surface from the actual URL, never from client-supplied headers.
    forwarded.set(academySurfaceHeader, app ? "app" : "web");
    if (app && !["/academy-app/sw.js", "/academy-app/manifest.webmanifest", "/academy-app/offline.html"].includes(pathname)) {
      const destination = request.nextUrl.clone();
      destination.pathname = canonicalAcademyPath(pathname);
      return NextResponse.rewrite(destination, { request: { headers: forwarded } });
    }
    return NextResponse.next({ request: { headers: forwarded } });
  }

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const segments = pathname.split("/").filter(Boolean); // ["admin", "<sisanya>"]
  const section = segments[1];

  if (section === "super" && !session.isSuperadmin) {
    return NextResponse.redirect(new URL("/admin?error=forbidden", request.url));
  }

  if (section === "akun-modul" && !session.isSuperadmin && !Object.values(session.moduleRoles ?? {}).includes("admin")) {
    return NextResponse.redirect(new URL("/admin?error=forbidden", request.url));
  }
  const isModuleSection = section && !["super", "modul", "akun-modul"].includes(section);
  if (isModuleSection && !session.isSuperadmin && !session.moduleSlugs.includes(section)) {
    return NextResponse.redirect(new URL("/admin?error=forbidden", request.url));
  }

  return NextResponse.next();
}
