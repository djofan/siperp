import { listArticles } from "@/modules/lazsip/api/articles";
import { ArticleCard } from "@/modules/lazsip/components/ArticleCard";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";

export default async function ArticlesPage() {
  const items = await listArticles();
  return <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
    <BackLink href="/lazsip#artikel">Kembali ke Beranda</BackLink>
    <h1 className="mt-6 text-3xl font-extrabold text-lazsip-primary-900 sm:text-5xl">Artikel & Panduan</h1>
    <p className="mt-4 text-lazsip-primary-800">Pelajari fiqih zakat, qurban, infak, dan sedekah.</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(article => <ArticleCard key={article.id} article={article} />)}</div>
    {!items.length && <p className="mt-8 text-lazsip-primary-800">Belum ada artikel terbit.</p>}
  </div>;
}
