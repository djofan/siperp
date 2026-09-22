import { listCampaigns } from "@/modules/lazsip/api/campaigns";
import { CampaignCard } from "@/modules/lazsip/components/CampaignCard";
import { PinnedGridSection } from "@/modules/lazsip/components/ui/PinnedGridSection";
import { SectionHeading } from "@/modules/lazsip/components/ui/SectionHeading";

export async function DonasiSection() {
  const allCampaigns = await listCampaigns();
  const visible = allCampaigns.filter((c) => c.status === "active");
  const pinned = visible.filter((c) => c.isPinned);
  // Item yang disematkan tetap ikut muncul di grid biasa di bawah, bukan cuma
  // di baris pin paling atas — biar gak "hilang" dari daftar utama.
  const rest = visible;

  return (
    <section id="donasi" className="bg-lazsip-primary-50/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <SectionHeading
          eyebrow="Donasi"
          title="Campaign Donasi Aktif"
          description="Salurkan donasi Anda untuk campaign pilihan dan pantau perkembangan dananya secara real-time."
        />
        <div className="mt-10">
          <PinnedGridSection
            pinnedItems={pinned}
            gridItems={rest}
            renderItem={(item) => (
              <CampaignCard
                id={item.id}
                title={item.title}
                description={item.description}
                image={item.image}
                targetAmount={item.targetAmount}
                currentAmount={item.currentAmount}
                donorCount={item.donorCount}
              />
            )}
            renderPinnedItem={(item) => (
              <CampaignCard
                id={item.id}
                title={item.title}
                description={item.description}
                image={item.image}
                targetAmount={item.targetAmount}
                currentAmount={item.currentAmount}
                donorCount={item.donorCount}
                featured
              />
            )}
            seeAllHref="/lazsip/donasi"
          />
        </div>
      </div>
    </section>
  );
}
