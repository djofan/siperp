export type AcademyBasePath = "/academy" | "/academy-app";
export const academySurfaceHeader = "x-siperp-academy-surface";
export function isAcademyAppPath(path: string) {
  return path === "/academy-app" || path.startsWith("/academy-app/");
}
export function canonicalAcademyPath(path: string) {
  if (!isAcademyAppPath(path)) return path;
  const suffix = path.slice("/academy-app".length);
  if (!suffix || suffix === "/") return "/academy/lanjut";
  if (suffix === "/login") return "/academy/masuk";
  if (suffix === "/beranda") return "/academy/belajar";
  return `/academy${suffix}`;
}
export function academyHref(path: string, base: AcademyBasePath) {
  if (base !== "/academy-app" || !/^\/academy(?:[/?#]|$)/.test(path)) return path;
  const mapped = path.replace(/^\/academy(?=[/?#]|$)/, base);
  return mapped.replace(/^\/academy-app\/masuk(?=[?#]|$)/, "/academy-app/login")
    .replace(/^\/academy-app\/belajar(?=[?#]|$)/, "/academy-app/beranda");
}
