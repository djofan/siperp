"use client";

import { useMemo } from "react";
import { usePersistedPreference } from "@/lib/usePersistedPreference";
import { BeneficiaryCard } from "@/modules/lazsip/components/BeneficiaryCard";
import { SectionHeading } from "@/modules/lazsip/components/ui/SectionHeading";
import { PinnedGridSection } from "@/modules/lazsip/components/ui/PinnedGridSection";

const AID_TYPE_LABEL: Record<string, string> = {
  pendidikan: "Pendidikan",
  kesehatan: "Kesehatan",
  kebutuhan_pokok: "Kebutuhan Pokok",
  lainnya: "Lainnya",
};

type FilterValue = "semua" | keyof typeof AID_TYPE_LABEL;

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "semua", label: "Semua" },
  ...(Object.entries(AID_TYPE_LABEL) as [FilterValue, string][]).map(([value, label]) => ({ value, label })),
];

interface BeneficiaryItem {
  id: string;
  name: string;
  age: number;
  amountReceived: number;
  aidType: string;
  photo: string | null;
  verifierArea: string;
  verifierName: string;
  isPinned: boolean;
}

const SEMUA_VERIFIKATOR = "semua";

export function PenyaluranBantuanClient({ items }: { items: BeneficiaryItem[] }) {
  const [filter, setFilter] = usePersistedPreference<FilterValue>(
    "lazsip-penyaluran-bantuan:aid-type",
    FILTER_OPTIONS.map((o) => o.value),
    "semua"
  );

  const verifierOptions = useMemo(
    () => Array.from(new Set(items.map((b) => b.verifierName))).sort(),
    [items]
  );
  // Verifikator yang tersimpan tapi sudah tidak ada di data otomatis kembali ke "semua".
  const [verifierFilter, setVerifierFilter] = usePersistedPreference(
    "lazsip-penyaluran-bantuan:verifier",
    [SEMUA_VERIFIKATOR, ...verifierOptions],
    SEMUA_VERIFIKATOR
  );

  const filtered = useMemo(
    () =>
      items
        .filter((b) => filter === "semua" || b.aidType === filter)
        .filter((b) => verifierFilter === SEMUA_VERIFIKATOR || b.verifierName === verifierFilter),
    [items, filter, verifierFilter]
  );

  const pinned = filtered.filter((b) => b.isPinned);
  // Item yang disematkan tetap ikut muncul di grid biasa di bawah, bukan cuma
  // di baris pin paling atas — biar gak "hilang" dari daftar utama.
  const rest = filtered;

  return (
    <section id="penyaluran" className="bg-lazsip-primary-50/60">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Penyaluran Bantuan"
          title="Penerima Manfaat LAZSIP"
          description="Sebagian penerima manfaat yang telah dibantu — data ditampilkan sesuai kebijakan privasi penerima."
        />

        <div className="mt-8 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                filter === opt.value
                  ? "border-lazsip-primary-500 bg-lazsip-primary-500 text-white"
                  : "border-lazsip-primary-200 bg-white text-lazsip-primary-800 hover:border-lazsip-primary-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {verifierOptions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVerifierFilter(SEMUA_VERIFIKATOR)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                verifierFilter === SEMUA_VERIFIKATOR
                  ? "border-lazsip-primary-900 bg-lazsip-primary-900 text-white"
                  : "border-lazsip-primary-200 bg-white text-lazsip-primary-800 hover:border-lazsip-primary-400"
              }`}
            >
              Semua Verifikator
            </button>
            {verifierOptions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setVerifierFilter(name)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  verifierFilter === name
                    ? "border-lazsip-primary-900 bg-lazsip-primary-900 text-white"
                    : "border-lazsip-primary-200 bg-white text-lazsip-primary-800 hover:border-lazsip-primary-400"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8">
          <PinnedGridSection
            pinnedItems={pinned}
            gridItems={rest}
            maxPinnedItems={4}
            renderItem={(item) => (
              <BeneficiaryCard
                id={item.id}
                name={item.name}
                age={item.age}
                amountReceived={item.amountReceived}
                aidType={item.aidType}
                photo={item.photo}
                verifierArea={item.verifierArea}
              />
            )}
            renderPinnedItem={(item) => (
              <BeneficiaryCard
                id={item.id}
                name={item.name}
                age={item.age}
                amountReceived={item.amountReceived}
                aidType={item.aidType}
                photo={item.photo}
                verifierArea={item.verifierArea}
                featured
              />
            )}
            seeAllHref="/lazsip/penyaluran-bantuan"
            seeAllLabel="Lihat Semua Bantuan"
            emptyLabel="Belum ada data penerima manfaat untuk kategori ini."
            pinnedItemClassName="w-[42vw] max-w-[170px] shrink-0 snap-start sm:w-[calc(33.333%-16px)] sm:max-w-none lg:w-[calc(25%-18px)]"
            gridColsClassName="grid-cols-3 sm:grid-cols-4 lg:grid-cols-5"
          />
        </div>
      </div>
    </section>
  );
}
