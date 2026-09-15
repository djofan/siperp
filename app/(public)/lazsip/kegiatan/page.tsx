import { listActivities } from "@/modules/lazsip/activities";
import { ActivityCard } from "@/components/lazsip/ActivityCard";
import { BackLink } from "@/components/lazsip/ui/BackLink";

export default async function LazsipKegiatanPage() {
  const activities = await listActivities();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <BackLink href="/lazsip#kegiatan">Kembali ke Beranda</BackLink>

      <span className="mb-4 mt-6 inline-flex items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
        Kegiatan
      </span>
      <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
        Semua Kegiatan LAZSIP
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-lazsip-secondary-700 sm:text-lg">
        Dokumentasi dan agenda kegiatan lapangan bersama relawan dan masyarakat dampingan.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {activities.map((item) => (
          <ActivityCard key={item.id} id={item.id} title={item.title} description={item.description} image={item.image} date={item.date} />
        ))}
      </div>

      {activities.length === 0 && <p className="mt-8 text-sm text-lazsip-primary-800/60">Belum ada kegiatan.</p>}
    </div>
  );
}
