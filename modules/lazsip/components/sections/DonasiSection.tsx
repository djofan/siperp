import { listCampaigns } from "@/modules/lazsip/api/campaigns";
import { CampaignCard } from "@/modules/lazsip/components/CampaignCard";
import { PinnedGridSection } from "@/modules/lazsip/components/ui/PinnedGridSection";
import { SectionHeading } from "@/modules/lazsip/components/ui/SectionHeading";

export async function DonasiSection() {
  const allCampaigns = await listCampaigns();
  // Campaign yang tombol donasinya dimatikan admin (status "completed") TETAP
  // ditampilkan di sini — cuma tombol "Donasi"-nya yang berubah jadi badge "Selesai"
  // (lihat CampaignCard). Menyembunyikan campaign sepenuhnya bukan yang diminta;
  // admin cuma mau matiin tombolnya, bukan menghilangkan campaign-nya.
  const pinned = allCampaigns.filter((c) => c.isPinned);
  const rest = allCampaigns;

  return (
    <section id="donasi" className="bg-lazsip-primary-50/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <SectionHeading
          eyebrow="Donasi"
          title="Campaign Donasi"
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
                status={item.status}
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
                status={item.status}
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
