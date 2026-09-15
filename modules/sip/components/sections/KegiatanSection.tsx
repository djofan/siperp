import { listKegiatan } from "@/modules/sip/api/kegiatan";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { KegiatanCard } from "@/modules/sip/components/KegiatanCard";

export async function KegiatanSection() {
  const kegiatan = await listKegiatan();
  if (kegiatan.length === 0) return null;

  return (
    <section id="kegiatan-terkini" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow="Kegiatan Terkini"
        title="Aksi Nyata di Lapangan"
        description="Dokumentasi penyaluran bantuan dan kegiatan terbaru dari tim verifikator SIP."
      />

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kegiatan.slice(0, 6).map((item) => (
          <KegiatanCard key={item.id} title={item.title} description={item.description} image={item.image} date={item.date} />
        ))}
      </div>
    </section>
  );
}
