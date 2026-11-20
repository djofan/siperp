import { notFound } from "next/navigation";
import { getArticle } from "@/modules/lazsip/api/articles";
import { articleCategory } from "@/contracts/modules/lazsipArticles";
import { ArticleBody } from "@/modules/lazsip/components/ArticleBody";
import { BackLinkGroup } from "@/modules/lazsip/components/ui/BackLinkGroup";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();
  return <article className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
    <BackLinkGroup homeHref="/lazsip#artikel" listHref="/lazsip/artikel" listLabel="Semua Artikel" />
    <span className="mt-8 inline-flex rounded-full bg-lazsip-primary-50 px-4 py-2 text-sm font-semibold text-lazsip-primary-800">{articleCategory(article.category)}</span>
    <h1 className="mb-8 mt-5 text-3xl font-extrabold leading-tight text-lazsip-primary-900 sm:text-5xl">{article.title}</h1>
    {article.author && <p className="mb-8 text-sm font-medium text-lazsip-primary-800">Ditulis oleh {article.author}</p>}
    <ArticleBody content={article.content} />
    {article.source && <aside className="mt-10 rounded-2xl border border-lazsip-primary-100 bg-white p-6"><h2 className="mb-3 text-lg font-bold text-lazsip-primary-900">Sumber / Rujukan</h2><ArticleBody content={article.source} /></aside>}
  </article>;
}
