// Error bisnis Tanwir — pesannya aman ditampilkan ke pengguna. Dipisah dari access.ts supaya
// logika inti tidak bergantung pada next/navigation (bisa diuji di luar Next).
export class TanwirError extends Error {}

export function errorMessage(error: unknown, fallback = "Data belum dapat disimpan. Coba lagi."): string {
  return error instanceof TanwirError ? error.message : fallback;
}
