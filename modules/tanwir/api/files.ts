import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { detectMediaFile, type DetectedFile } from "./policy";
import { TanwirError } from "./errors";

// File setoran & foto profil bersifat privat (prd-tanwir §6.11, §8) — disimpan di luar folder
// public dan hanya bisa diambil lewat endpoint yang memeriksa hak akses.
export const uploadRoot = path.resolve(/* turbopackIgnore: true */ process.env.TANWIR_UPLOAD_DIR ?? ".tanwir-uploads");

/** Path relatif yang aman (tanpa "..") → path absolut di dalam uploadRoot. */
export function resolveUploadPath(relative: string): string | null {
  const absolute = path.resolve(uploadRoot, relative);
  return absolute.startsWith(uploadRoot + path.sep) ? absolute : null;
}

/**
 * Cegah unggahan lintas situs (CSRF): header Origin harus sama dengan host yang dituju.
 * Dibandingkan dengan header Host/X-Forwarded-Host, bukan request.url — di balik proxy atau
 * saat dev, request.url bisa memakai host internal yang berbeda dari yang dibuka pengguna.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host.split(",")[0].trim();
  } catch {
    return false;
  }
}

export async function readUpload(file: File, maxBytes: number): Promise<{ bytes: Buffer; detected: DetectedFile }> {
  if (file.size === 0) throw new TanwirError("File kosong.");
  if (file.size > maxBytes) throw new TanwirError(`Ukuran file maksimal ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = detectMediaFile(bytes);
  if (!detected) throw new TanwirError("Format file tidak dikenali.");
  return { bytes, detected };
}

export async function saveUpload(folder: string, bytes: Buffer, ext: string): Promise<string> {
  const { mkdir, writeFile } = await import(/* turbopackIgnore: true */ "node:fs/promises");
  const relative = path.posix.join(folder, `${randomUUID()}.${ext}`);
  const absolute = resolveUploadPath(relative);
  if (!absolute) throw new TanwirError("Lokasi file tidak valid.");
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
  return relative;
}

export async function deleteUpload(relative: string | null | undefined): Promise<void> {
  if (!relative) return;
  const absolute = resolveUploadPath(relative);
  if (!absolute) return;
  const { rm } = await import(/* turbopackIgnore: true */ "node:fs/promises");
  await rm(absolute, { force: true }).catch(() => undefined);
}

/** Respons file dengan dukungan HTTP Range (pemutar audio/video perlu seek). */
export async function streamUpload(request: Request, relative: string, mime: string): Promise<Response> {
  const absolute = resolveUploadPath(relative);
  if (!absolute) return new Response(null, { status: 404 });
  const { stat } = await import(/* turbopackIgnore: true */ "node:fs/promises");
  const { createReadStream } = await import(/* turbopackIgnore: true */ "node:fs");
  const { Readable } = await import("node:stream");
  const info = await stat(absolute).catch(() => null);
  if (!info) return new Response(null, { status: 404 });

  const range = request.headers.get("range");
  let start = 0;
  let end = info.size - 1;
  if (range) {
    const parsed = /^bytes=(\d*)-(\d*)$/.exec(range);
    const invalid = new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    if (!parsed || (!parsed[1] && !parsed[2])) return invalid;
    if (!parsed[1]) start = Math.max(0, info.size - Number(parsed[2]));
    else {
      start = Number(parsed[1]);
      if (parsed[2]) end = Math.min(end, Number(parsed[2]));
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) return invalid;
  }
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  };
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
  return new Response(Readable.toWeb(createReadStream(absolute, { start, end })) as ReadableStream, {
    status: range ? 206 : 200,
    headers,
  });
}
