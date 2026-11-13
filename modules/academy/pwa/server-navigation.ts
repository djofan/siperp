import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { academyHref, academySurfaceHeader, type AcademyBasePath } from "./navigation";
export const getAcademyBasePath = cache(async (): Promise<AcademyBasePath> =>
  (await headers()).get(academySurfaceHeader) === "app" ? "/academy-app" : "/academy");
export async function academyServerHref(path: string) {
  return academyHref(path, await getAcademyBasePath());
}
