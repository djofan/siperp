import "server-only";
import { prisma } from "@/lib/prisma";

// Data wilayah Indonesia dari API publik emsifa (gratis, statis). Dipanggil dari server dan di-cache
// sehari, jadi browser tidak bergantung langsung ke layanan luar (prd-tanwir §8).
const WILAYAH_BASE = "https://www.emsifa.com/api-wilayah-indonesia/api";

export type WilayahLevel = "provinsi" | "kota" | "kecamatan" | "kelurahan";
export interface WilayahOption {
  id: string;
  name: string;
}

const PATHS: Record<WilayahLevel, (parentId: string) => string> = {
  provinsi: () => "/provinces.json",
  kota: (id) => `/regencies/${id}.json`,
  kecamatan: (id) => `/districts/${id}.json`,
  kelurahan: (id) => `/villages/${id}.json`,
};

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function fetchWilayah(level: WilayahLevel, parentId = ""): Promise<WilayahOption[]> {
  if (level !== "provinsi" && !/^\d{1,13}$/.test(parentId)) return [];
  try {
    const response = await fetch(WILAYAH_BASE + PATHS[level](parentId), {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { id: string; name: string }[];
    return data.map((item) => ({ id: String(item.id), name: titleCase(item.name) }));
  } catch {
    return [];
  }
}

// Geocoding Nominatim (OpenStreetMap) — gratis dengan batas 1 permintaan/detik & wajib User-Agent.
// Berjenjang kelurahan → kecamatan → kota → provinsi seperti aplikasi lama.
async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${query}, Indonesia`);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "id");
    const response = await fetch(url, {
      headers: { "User-Agent": "PlatformSIP-Tanwir/1.0 (insanpeduli.org)" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { lat: string; lon: string }[];
    if (!data[0]) return null;
    return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Isi lat/lng anggota dari nama wilayahnya. Gagal = dibiarkan kosong, tidak melempar error. */
export async function geocodeMember(memberId: string): Promise<void> {
  const member = await prisma.tanwirMember.findUnique({
    where: { id: memberId },
    select: { villageName: true, districtName: true, cityName: true, provinceName: true },
  });
  if (!member?.provinceName) return;
  const parts = [member.villageName, member.districtName, member.cityName, member.provinceName];
  const attempts = [0, 1, 2, 3]
    .map((skip) => parts.slice(skip).filter(Boolean).join(", "))
    .filter((query, index, all) => query && all.indexOf(query) === index);
  for (const [index, query] of attempts.entries()) {
    if (index > 0) await sleep(1100);
    const point = await geocode(query);
    if (point) {
      await prisma.tanwirMember.update({ where: { id: memberId }, data: { latitude: point.lat, longitude: point.lon } });
      return;
    }
  }
}
