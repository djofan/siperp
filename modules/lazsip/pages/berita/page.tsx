import { listPublishedNews } from "@/modules/lazsip/api/news";
import { NewsCard } from "@/modules/lazsip/components/NewsCard";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";

export default async function LazsipBeritaPage() {
  const news = await listPublishedNews();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <BackLink href="/lazsip#berita">Kembali ke Beranda</BackLink>

      <span className="mb-4 mt-6 inline-flex items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
        Berita &amp; Kabar
      </span>
      <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
        Semua Berita LAZSIP
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-lazsip-secondary-700 sm:text-lg">
        Ikuti perkembangan program dan kegiatan LAZSIP.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((item) => (
          <NewsCard key={item.id} id={item.id} title={item.title} content={item.content} image={item.image} createdAt={item.createdAt} />
        ))}
      </div>

      {news.length === 0 && <p className="mt-8 text-sm text-lazsip-primary-800/60">Belum ada berita.</p>}
    </div>
  );
}
