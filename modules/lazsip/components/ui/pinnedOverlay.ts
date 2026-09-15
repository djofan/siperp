import type { CSSProperties } from "react";

// Overlay gradient hijau tua untuk card pinned (Berita, Donasi, Program, Kegiatan).
// Warna = --color-lazsip-primary-900 (#16301f) dalam rgb.
export const PINNED_OVERLAY_STYLE: CSSProperties = {
  background:
    "linear-gradient(to bottom, rgba(22,48,31,0) 0%, rgba(22,48,31,0) 30%, rgba(22,48,31,0.15) 45%, rgba(22,48,31,0.5) 65%, rgba(22,48,31,0.85) 85%, rgba(22,48,31,0.95) 100%)",
};
