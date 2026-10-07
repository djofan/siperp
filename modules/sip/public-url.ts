/** Keep links saved by the CMS before SIP moved to the domain root working. */
export function sipPublicUrl(value: string): string {
  if (value === "/sip") return "/";
  if (value.startsWith("/sip/")) return value.slice(4);
  if (value.startsWith("/sip#") || value.startsWith("/sip?")) return "/" + value.slice(4);
  return value;
}
