/**
 * Latar gradasi hijau gelap dipakai di SEMUA shell admin (Core, LAZSIP, SARSIP, SIP)
 * supaya satu bahasa visual — bukan lagi flat abu/hitam polos. `glow` = warna hijau
 * khas modul itu (dipakai low-opacity), bukan warna dekoratif acak.
 * `placement` membedakan komposisi cahaya per shell supaya karakternya sama (gelap,
 * grain, glow halus) tapi tidak kembar persis:
 * - "corners": dua sudut diagonal (LAZSIP, SARSIP)
 * - "top": satu glow lebar di atas tengah, lebih tenang (Core/superadmin)
 * - "bottom": glow dari kiri bawah + pantulan tipis kanan atas (SIP)
 * Academy TIDAK pakai komponen ini — tema itu dikerjakan tim lain.
 */
export type AdminGlowPlacement = "corners" | "top" | "bottom";

function glowLayers(glow: string, placement: AdminGlowPlacement): string {
  switch (placement) {
    case "top":
      return (
        `radial-gradient(ellipse 70% 45% at 50% -8%, rgba(${glow},0.2), transparent 70%),` +
        "linear-gradient(180deg, #0b0e0a 0%, #0e110c 50%, #090a08 100%)"
      );
    case "bottom":
      return (
        `radial-gradient(circle at 0% 100%, rgba(${glow},0.16), transparent 45%),` +
        `radial-gradient(circle at 100% 0%, rgba(${glow},0.07), transparent 38%),` +
        "linear-gradient(200deg, #0b0e09 0%, #0f130b 55%, #080a07 100%)"
      );
    default:
      return (
        `radial-gradient(circle at 8% 6%, rgba(${glow},0.22), transparent 42%),` +
        `radial-gradient(circle at 96% 100%, rgba(${glow},0.14), transparent 48%),` +
        "radial-gradient(circle at 55% -10%, rgba(255,255,255,0.05), transparent 50%)," +
        "linear-gradient(165deg, #0c0f0a 0%, #10140d 45%, #090b08 100%)"
      );
  }
}

export function AdminGradientBackground({
  glow,
  placement = "corners",
}: {
  glow: string;
  placement?: AdminGlowPlacement;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: glowLayers(glow, placement) }} />
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
