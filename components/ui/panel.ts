import { cn } from "@/lib/utils";

// Kelas dasar panel minimalis — dipakai lintas komponen admin Core biar
// konsisten: bg-surface + soft shadow buat pemisah visual, TANPA garis
// border (biar gak kesan "kotak-kotak bergaris" saat banyak card ditumpuk).
export function panelClasses(className?: string) {
  return cn("rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]", className);
}

// Sama seperti panelClasses, tapi SELALU putih (tidak ikut token tema
// gelap Core). Dipakai di komponen admin LAZSIP/SIP yang teks internalnya
// masih pakai warna ink statis (mis. text-lazsip-primary-900) — kalau
// background-nya ikut gelap tapi teksnya tidak, jadi tidak kebaca.
export function staticPanelClasses(className?: string) {
  return cn("rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]", className);
}
