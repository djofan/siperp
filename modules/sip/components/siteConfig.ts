export const sipSiteConfig = {
  name: "SIP",
  fullName: "Solidaritas Insan Peduli",
  nav: [
    { label: "Profil", href: "/tentang-kami" },
    { label: "Layanan", href: "/layanan" },
    { label: "Program", href: "/program-bantuan" },
    { label: "Berita", href: "/berita" },
    { label: "Laporan", href: "/laporan" },
    { label: "Kontak", href: "/kontak" },
  ],
};

/** Buang item navigasi `/#anchor` yang section-nya sedang disembunyikan admin. */
export function filterNavByHidden<T extends { href: string }>(items: T[], hidden: string[]) {
  return items.filter((item) => {
    const anchor = item.href.split("#")[1];
    return !anchor || !hidden.includes(anchor);
  });
}
