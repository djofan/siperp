const webRoot = "/admin/bantuan";
export const mobileWorkspaceRoot = "/bantuan-app/workspace";

export function workspaceHref(href: string, mobile: boolean): string {
  if (!mobile) return href;
  if (href === "/admin/pengaturan-akun") return "/bantuan-app/akun";
  if (href === "/admin/login") return "/bantuan-app/login";
  if (href !== webRoot && !href.startsWith(webRoot+"/") && !href.startsWith(webRoot+"?") && !href.startsWith(webRoot+"#")) return href;
  const suffix = href.slice(webRoot.length);
  if(suffix==="/"||suffix.startsWith("/?")||suffix.startsWith("/#"))return "/bantuan-app/beranda"+suffix.slice(1);
  return !suffix || suffix.startsWith("?") || suffix.startsWith("#")
    ? "/bantuan-app/beranda"+suffix
    : mobileWorkspaceRoot+suffix;
}
