import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./session";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
  }
}

export function backendUrl(path: string) {
  const base = process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000/api/v1";
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, unwrap = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let bodyInput = init.body;
  let method = init.method;
  if (bodyInput instanceof FormData) {
    const original = bodyInput;
    const multipart = new FormData();
    const counts = new Map<string, number>();
    for (const key of original.keys()) counts.set(key, (counts.get(key) ?? 0) + 1);
    for (const [key, value] of original) {
      if (key.startsWith("$ACTION_")) continue;
      multipart.append((counts.get(key) ?? 0) > 1 && !key.endsWith("[]") ? `${key}[]` : key, value);
    }
    bodyInput = multipart;
    if (method && !["POST", "GET", "HEAD"].includes(method.toUpperCase())) {
      headers.set("X-HTTP-Method-Override", method.toUpperCase());
      method = "POST";
    }
  } else if (bodyInput) headers.set("Content-Type", "application/json");
  let response: Response;
  try { response = await fetch(backendUrl(path), { ...init, method, body: bodyInput, headers, cache: "no-store" }); }
  catch { throw new ApiError("Backend Laravel belum dapat dihubungi. Periksa layanan API.", 503); }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text, (_key, value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) ? new Date(value) : value);
  } catch {
    throw new ApiError("Backend mengembalikan respons yang tidak valid.", response.status);
  }
  if (!response.ok) {
    throw new ApiError(typeof body.error === "string" ? body.error : body.error?.message ?? "Request gagal.", response.status, body.error?.details);
  }
  return (unwrap && Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body) as T;
}

export async function apiCollection<T>(path: string): Promise<T[]> {
  const result: T[] = [];
  let page = 1;
  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await apiRequest<{ data: T[]; current_page: number; last_page: number }>(`${path}${separator}page=${page}&per_page=100`, {}, false);
    result.push(...response.data);
    if (response.current_page >= response.last_page) return result;
    page++;
  }
}
