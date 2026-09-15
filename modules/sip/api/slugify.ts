// Fungsi murni, sengaja dipisah dari programBantuan.ts (yang import prisma) supaya aman
// di-bundle ke client component (ProgramBantuanForm.tsx) tanpa ikut menarik runtime Prisma.
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
