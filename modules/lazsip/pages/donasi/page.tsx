import { listCampaigns } from "@/modules/lazsip/api/campaigns";
import { CampaignCard } from "@/modules/lazsip/components/CampaignCard";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";

export default async function LazsipDonasiPage() {
  const campaigns = (await listCampaigns()).filter((c) => c.status === "active");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <BackLink href="/lazsip#donasi">Kembali ke Beranda</BackLink>

      <span className="mb-4 mt-6 inline-flex items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
        Donasi
      </span>
      <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
        Semua Campaign Donasi
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-lazsip-secondary-700 sm:text-lg">
        Salurkan donasi Anda untuk campaign pilihan dan pantau perkembangan dananya secara real-time.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((item) => (
          <CampaignCard key={item.id} id={item.id} title={item.title} description={item.description} image={item.image} targetAmount={item.targetAmount} currentAmount={item.currentAmount} donorCount={item.donorCount} />
        ))}
      </div>

      {campaigns.length === 0 && <p className="mt-8 text-sm text-lazsip-primary-800/60">Belum ada campaign donasi.</p>}
    </div>
  );
}
