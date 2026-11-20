import Link from "next/link";
import { listArticles } from "@/modules/lazsip/api/articles";
import { ArticleCard } from "@/modules/lazsip/components/ArticleCard";
import { SectionHeading } from "@/modules/lazsip/components/ui/SectionHeading";

export async function ArtikelSection() {
  const items = await listArticles();
  return <section id="artikel" className="scroll-mt-24 border-y border-lazsip-primary-100 bg-lazsip-primary-50/40">
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionHeading eyebrow="Artikel & Panduan" title="Kenali ilmunya, tunaikan dengan yakin." description="Bacaan seputar fiqih zakat, qurban, infak, dan sedekah." />
      {items.length ? <>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.slice(0, 6).map(article => <ArticleCard key={article.id} article={article} />)}</div>
        <div className="mt-8 text-center"><Link href="/lazsip/artikel" className="inline-flex rounded-full border border-lazsip-primary-200 bg-white px-6 py-3 text-sm font-semibold text-lazsip-primary-900 hover:bg-lazsip-primary-50">Lihat semua artikel →</Link></div>
      </> : <p className="mt-8 rounded-2xl border border-lazsip-primary-100 bg-white p-6 text-sm text-lazsip-primary-800">Artikel dan panduan akan hadir di sini.</p>}
    </div>
  </section>;
}
