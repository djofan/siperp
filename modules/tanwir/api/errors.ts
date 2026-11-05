import { ApiError } from "@/lib/api";

// Error bisnis Tanwir dan validasi API yang aman ditampilkan ke pengguna.
export class TanwirError extends Error {}

export function errorMessage(error: unknown, fallback = "Data belum dapat disimpan. Coba lagi."): string {
  if (error instanceof TanwirError) return error.message;
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return Object.values(error.details ?? {}).flat().find((message) => message.trim()) || error.message || fallback;
  }
  return fallback;
}
