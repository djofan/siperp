"use client";

import { useEffect, useState } from "react";

type Level = "provinsi" | "kota" | "kecamatan" | "kelurahan";
interface Option {
  id: string;
  name: string;
}

export interface WilayahValue {
  provinceId: string | null;
  provinceName: string | null;
  cityId: string | null;
  cityName: string | null;
  districtId: string | null;
  districtName: string | null;
  villageId: string | null;
  villageName: string | null;
}

const LEVELS: { level: Level; label: string; idKey: keyof WilayahValue; nameKey: keyof WilayahValue }[] = [
  { level: "provinsi", label: "Provinsi", idKey: "provinceId", nameKey: "provinceName" },
  { level: "kota", label: "Kota / kabupaten", idKey: "cityId", nameKey: "cityName" },
  { level: "kecamatan", label: "Kecamatan", idKey: "districtId", nameKey: "districtName" },
  { level: "kelurahan", label: "Kelurahan / desa", idKey: "villageId", nameKey: "villageName" },
];

async function load(level: Level, parent = ""): Promise<Option[]> {
  try {
    const response = await fetch(`/api/tanwir/wilayah/${level}?parent=${encodeURIComponent(parent)}`);
    return response.ok ? ((await response.json()) as Option[]) : [];
  } catch {
    return [];
  }
}

/**
 * Alamat berjenjang (data emsifa lewat server). Mengirim id & nama tiap tingkat lewat input
 * tersembunyi. Bila layanan wilayah gagal, isian "Alamat detail" tetap bisa diisi manual.
 */
export function WilayahFields({
  initial,
  selectClass,
  labelClass = "text-sm font-medium",
}: {
  initial: WilayahValue;
  selectClass: string;
  labelClass?: string;
}) {
  const [value, setValue] = useState<WilayahValue>(initial);
  const [options, setOptions] = useState<Record<Level, Option[]>>({ provinsi: [], kota: [], kecamatan: [], kelurahan: [] });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const provinces = await load("provinsi");
      if (cancelled) return;
      if (!provinces.length) setFailed(true);
      // Muat ulang rantai pilihan yang sudah tersimpan agar dropdown tampil terisi.
      const [cities, districts, villages] = await Promise.all([
        initial.provinceId ? load("kota", initial.provinceId) : Promise.resolve([]),
        initial.cityId ? load("kecamatan", initial.cityId) : Promise.resolve([]),
        initial.districtId ? load("kelurahan", initial.districtId) : Promise.resolve([]),
      ]);
      if (!cancelled) setOptions({ provinsi: provinces, kota: cities, kecamatan: districts, kelurahan: villages });
    })();
    return () => {
      cancelled = true;
    };
  }, [initial.provinceId, initial.cityId, initial.districtId]);

  async function change(index: number, id: string) {
    const current = LEVELS[index];
    const picked = options[current.level].find((option) => option.id === id);
    const next = { ...value, [current.idKey]: id || null, [current.nameKey]: picked?.name ?? null };
    // Tingkat di bawahnya direset karena induknya berubah.
    for (const lower of LEVELS.slice(index + 1)) {
      next[lower.idKey] = null;
      next[lower.nameKey] = null;
    }
    setValue(next);
    const child = LEVELS[index + 1];
    const cleared = Object.fromEntries(LEVELS.slice(index + 1).map((lower) => [lower.level, [] as Option[]]));
    setOptions((prev) => ({ ...prev, ...cleared }));
    if (child && id) {
      const children = await load(child.level, id);
      setOptions((prev) => ({ ...prev, [child.level]: children }));
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {LEVELS.map((item, index) => {
        const parentMissing = index > 0 && !value[LEVELS[index - 1].idKey];
        const selectedId = (value[item.idKey] as string | null) ?? "";
        const list = options[item.level];
        // Pastikan nilai tersimpan tetap tampil walau daftar belum termuat.
        const withSaved = selectedId && !list.some((option) => option.id === selectedId) ? [{ id: selectedId, name: (value[item.nameKey] as string) ?? selectedId }, ...list] : list;
        return (
          <label key={item.level} className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>{item.label}</span>
            <select
              value={selectedId}
              disabled={parentMissing || failed}
              onChange={(event) => change(index, event.target.value)}
              className={selectClass}
            >
              <option value="">{parentMissing ? `Pilih ${LEVELS[index - 1].label.toLowerCase()} dulu` : `Pilih ${item.label.toLowerCase()}`}</option>
              {withSaved.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <input type="hidden" name={item.idKey} value={selectedId} />
            <input type="hidden" name={item.nameKey} value={(value[item.nameKey] as string | null) ?? ""} />
          </label>
        );
      })}
      {failed && <p className="text-xs opacity-70 sm:col-span-2">Data wilayah sedang tidak bisa dimuat. Tulis alamat lengkap di kolom alamat detail.</p>}
    </div>
  );
}
