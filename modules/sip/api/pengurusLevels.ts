// Sengaja dipisah dari pengurus.ts (yang import prisma) supaya aman di-bundle ke client
// component — PengurusManager.tsx (client) butuh daftar level ini tanpa ikut menarik
// runtime Prisma ke bundle browser.
export const PENGURUS_LEVELS = ["pembina", "pengurus_inti", "pengawas", "tim"] as const;
export type PengurusLevel = (typeof PENGURUS_LEVELS)[number];
