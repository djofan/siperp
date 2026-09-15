"use client";

import { useMemo, useState } from "react";
import { BeneficiaryCard } from "@/components/lazsip/BeneficiaryCard";
import { SectionHeading } from "@/components/lazsip/ui/SectionHeading";
import { Button } from "@/components/lazsip/ui/Button";

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
  amountReceived: number;
  aidType: string;
  photo: string | null;
}

export function PenyaluranBantuanClient({ items }: { items: BeneficiaryItem[] }) {
  const [filter, setFilter] = useState<FilterValue>("semua");

  const filtered = useMemo(
    () => (filter === "semua" ? items : items.filter((b) => b.aidType === filter)),
    [items, filter]
  );

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

        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <BeneficiaryCard key={item.id} id={item.id} name={item.name} amountReceived={item.amountReceived} aidType={item.aidType} photo={item.photo} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-8 text-sm text-lazsip-primary-800/60">Belum ada data penerima manfaat untuk kategori ini.</p>
        )}

        <div className="mt-10 flex justify-center">
          <Button href="/lazsip/penyaluran-bantuan" variant="secondary" icon="arrow">
            Lihat Semua Bantuan
          </Button>
        </div>
      </div>
    </section>
  );
}
