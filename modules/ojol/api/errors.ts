// Error bisnis Ojol — pesannya aman ditampilkan ke pengguna. Dipisah dari access.ts supaya
// logika inti tidak bergantung pada next/navigation (bisa diuji di luar Next).
export class OjolError extends Error {}

export function errorMessage(error: unknown, fallback = "Data belum dapat disimpan. Coba lagi."): string {
  return error instanceof OjolError ? error.message : fallback;
}
