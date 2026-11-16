"use client";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, type ComponentProps, type ReactNode } from "react";
import { academyHref, type AcademyBasePath } from "./navigation";
const AcademySurface = createContext<AcademyBasePath>("/academy");
export function AcademySurfaceProvider({ basePath, children }: { basePath: AcademyBasePath; children: ReactNode }) {
  return <AcademySurface.Provider value={basePath}>{children}</AcademySurface.Provider>;
}
export function useAcademyBasePath() { return useContext(AcademySurface); }
export default function AcademyLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const base = useAcademyBasePath();
  const mapped = typeof href === "string" ? academyHref(href, base) : { ...href, pathname: href.pathname ? academyHref(href.pathname, base) : href.pathname };
  return <NextLink {...props} href={mapped} />;
}
export function AcademyAnchor({ href, ...props }: ComponentProps<"a">) {
  const base = useAcademyBasePath();
  return <a {...props} href={href ? academyHref(href, base) : href} />;
}
export function useAcademyRouter() {
  const router = useRouter();
  const base = useAcademyBasePath();
  return useMemo(() => ({ ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(academyHref(href, base), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(academyHref(href, base), options),
  }), [router, base]);
}
