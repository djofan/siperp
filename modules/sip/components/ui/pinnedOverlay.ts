import type { CSSProperties } from "react";

// Overlay gradient hijau tua untuk card pinned (Berita, Program Bantuan).
// Warna = --color-sip-primary-900 (#213504) dalam rgb.
export const PINNED_OVERLAY_STYLE: CSSProperties = {
  background:
    "linear-gradient(to bottom, rgba(33,53,4,0) 0%, rgba(33,53,4,0) 30%, rgba(33,53,4,0.15) 45%, rgba(33,53,4,0.5) 65%, rgba(33,53,4,0.85) 85%, rgba(33,53,4,0.95) 100%)",
};
