/** Keep only list filters; external URLs and alternate routes are never accepted. */
export function listReturn(base: string, value: unknown) {
  if (typeof value !== "string") return base;
  try {
    const url = new URL(value, "https://academy.invalid");
    if (url.origin !== "https://academy.invalid" || url.pathname !== base) return base;
    const query = new URLSearchParams();
    for (const key of ["q", "status", "cohort", "tab", "page"]) {
      const item = url.searchParams.get(key);
      if (item && (key !== "page" || /^[1-9][0-9]{0,5}$/.test(item))) query.set(key, item.slice(0, key === "q" ? 100 : 191));
    }
    return base + (query.size ? `?${query}` : "");
  } catch { return base; }
}
