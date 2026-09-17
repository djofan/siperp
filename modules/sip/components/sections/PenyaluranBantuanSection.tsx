import { listPenyaluranBantuan } from "@/modules/sip/api/penyaluranBantuan";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";
import { PenyaluranBantuanCard } from "@/modules/sip/components/PenyaluranBantuanCard";

interface PenyaluranBantuanSectionContent {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export async function PenyaluranBantuanSection({ content }: { content: PenyaluranBantuanSectionContent }) {
  const penyaluran = await listPenyaluranBantuan();

  return (
    <section id="penyaluran-bantuan" className="bg-sip-primary-50/50 py-12 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={content.eyebrow || "Penyaluran Bantuan"}
          title={content.title || "Sudah Tersalurkan ke Mana Saja"}
          description={content.description || "Dokumentasi realisasi penyaluran bantuan oleh tim verifikator SIP di lapangan."}
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
    </section>
  );
}
