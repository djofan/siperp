import { listPenyaluranBantuan } from "@/modules/sip/api/penyaluranBantuan";
import { PenyaluranBantuanCard } from "@/modules/sip/components/PenyaluranBantuanCard";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";

export default async function PenyaluranBantuanListPage() {
  const penyaluran = await listPenyaluranBantuan();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <SectionHeading
        eyebrow="Penyaluran Bantuan"
        title="Semua Dokumentasi Penyaluran Bantuan"
        description="Dokumentasi realisasi penyaluran bantuan oleh tim verifikator SIP di lapangan."
      />

      {penyaluran.length === 0 ? (
        <SectionEmptyState message="Belum ada dokumentasi penyaluran bantuan." />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {penyaluran.map((item) => (
            <PenyaluranBantuanCard
              key={item.id}
              title={item.title}
              description={item.description}
              image={item.image}
              location={item.location}
              date={item.date}
            />
          ))}
        </div>
      )}
    </div>
  );
}
