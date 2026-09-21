import { listActivities } from "@/modules/lazsip/api/activities";
import { ActivityCard } from "@/modules/lazsip/components/ActivityCard";
import { PinnedGridSection } from "@/modules/lazsip/components/ui/PinnedGridSection";
import { SectionHeading } from "@/modules/lazsip/components/ui/SectionHeading";

export async function KegiatanSection() {
  const activities = await listActivities();
  const pinned = activities.filter((a) => a.isPinned);
  // Item yang disematkan tetap ikut muncul di grid biasa di bawah, bukan cuma
  // di baris pin paling atas — biar gak "hilang" dari daftar utama.
  const rest = activities;

  return (
    <section id="kegiatan" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow="Kegiatan"
        title="Agenda & Kegiatan LAZSIP"
        description="Dokumentasi dan agenda kegiatan lapangan bersama relawan dan masyarakat dampingan."
      />
      <div className="mt-10">
        <PinnedGridSection
          pinnedItems={pinned}
          gridItems={rest}
          renderItem={(item) => (
            <ActivityCard id={item.id} title={item.title} description={item.description} image={item.image} date={item.date} />
          )}
          renderPinnedItem={(item) => (
            <ActivityCard id={item.id} title={item.title} description={item.description} image={item.image} date={item.date} featured />
          )}
          seeAllHref="/lazsip/kegiatan"
        />
      </div>
    </section>
  );
}
