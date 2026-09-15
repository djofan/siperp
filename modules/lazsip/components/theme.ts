/**
 * Palet admin dashboard LAZSIP (dipakai lewat inline style di komponen admin lama).
 * Nilai sama persis dengan token Tailwind `lazsip-primary-900` / `lazsip-secondary-500`
 * di app/globals.css — dipertahankan di sini untuk kompatibilitas komponen admin yang
 * belum dimigrasikan ke class Tailwind langsung.
 */
export const lazsipColors = {
  primary: "#16301f",
  secondary: "#4f7959",
  ink: "#313832",
  surface: "#FFFFFF",
  surfaceMuted: "#F7F7F5",
} as const;
