/**
 * Warna badge per-modul — dipakai KECIL saja (badge/dot di tabel superadmin),
 * bukan sebagai warna dominan halaman Core mana pun. Lihat docs/prd-core.md §9.
 * Modul yang belum punya warna resmi jatuh ke fallback abu netral.
 */
interface ModuleBadgeColor {
  bg: string;
  text: string;
  dot: string;
}

const MODULE_BADGE_COLORS: Record<string, ModuleBadgeColor> = {
  lazsip: { bg: "bg-[#73AE43]/10", text: "text-[#4F7A2C]", dot: "bg-[#73AE43]" },
  sip: { bg: "bg-[#74AF27]/10", text: "text-[#213504]", dot: "bg-[#74AF27]" },
  sarsip: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-amber-500" },
};

const FALLBACK_BADGE_COLOR: ModuleBadgeColor = {
  bg: "bg-surface-muted",
  text: "text-foreground/60",
  dot: "bg-foreground/30",
};

export function getModuleBadgeColor(slug: string): ModuleBadgeColor {
  return MODULE_BADGE_COLORS[slug] ?? FALLBACK_BADGE_COLOR;
}
