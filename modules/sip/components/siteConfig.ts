export const sipSiteConfig = {
  name: "SIP",
  fullName: "Solidaritas Insan Peduli",
  nav: [
    { label: "Tentang", href: "/sip#tentang" },
    { label: "Program", href: "/sip#program" },
    { label: "Berita", href: "/sip#berita" },
    { label: "Jangkauan", href: "/sip#jangkauan-bantuan" },
    { label: "Laporan", href: "/sip#laporan" },
  ],
};

/** Buang item navigasi `/sip#anchor` yang section-nya sedang disembunyikan admin. */
export function filterNavByHidden<T extends { href: string }>(items: T[], hidden: string[]) {
  return items.filter((item) => {
    const anchor = item.href.split("#")[1];
    return !anchor || !hidden.includes(anchor);
  });
}
