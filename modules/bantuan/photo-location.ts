import type { PhotoLocation } from "@/contracts/modules/bantuan";

export function photoLocationPoint(value: unknown): PhotoLocation | null {
  if (!value || typeof value !== "object") return null;
  const p = value as PhotoLocation;
  if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) || Math.abs(p.latitude)>90 || Math.abs(p.longitude)>180 || !["exif","device"].includes(p.source)) return null;
  return {latitude:p.latitude,longitude:p.longitude,source:p.source,...(typeof p.accuracy==="number"&&Number.isFinite(p.accuracy)&&p.accuracy>=0?{accuracy:p.accuracy}:{})};
}

export function photoMapUrl(value: unknown): string | null {
  const point = photoLocationPoint(value);
  return point ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.latitude},${point.longitude}`)}` : null;
}

export function appendPhotoLocation(body: FormData, location?: PhotoLocation | null): void {
  const point = photoLocationPoint(location);
  if (!point) return;
  for (const [key,value] of Object.entries(point)) body.set(`location[${key}]`, String(value));
}

export async function readPhotoLocation(file: File): Promise<PhotoLocation | null> {
  if (file.size>30*1024*1024) return null;
  try {
    const { gps } = await import("exifr");
    const point = await gps(await file.arrayBuffer());
    return photoLocationPoint(point ? {...point,source:"exif"} : null);
  } catch { return null; } // Missing or damaged EXIF must not block evidence uploads.
}
