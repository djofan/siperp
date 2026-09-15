import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  const isModuleSection = section && section !== "super";
  if (isModuleSection && !session.isSuperadmin && !session.moduleSlugs.includes(section)) {
    return NextResponse.redirect(new URL("/admin?error=forbidden", request.url));
  }

  return NextResponse.next();
}
