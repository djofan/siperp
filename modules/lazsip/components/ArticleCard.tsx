import Link from "next/link";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { articleCategory, articleExcerpt, type LazsipArticle } from "@/contracts/modules/lazsipArticles";

export function ArticleCard({ article }: { article: LazsipArticle }) {
  return <Link href={`/lazsip/artikel/${article.id}`} className="group flex h-full flex-col rounded-3xl border border-lazsip-primary-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-lazsip-primary-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lazsip-primary-700">
    <div className="flex items-center justify-between gap-3">
      <span className="rounded-full bg-lazsip-primary-50 px-3 py-1 text-xs font-semibold text-lazsip-primary-800">{articleCategory(article.category)}</span>
      <BookOpen aria-hidden className="h-5 w-5 text-lazsip-primary-600" />
    </div>
    <h3 className="mt-5 text-xl font-bold leading-snug text-lazsip-primary-900 group-hover:text-lazsip-primary-700">{article.title}</h3>
    <p className="mt-3 line-clamp-3 text-sm leading-7 text-lazsip-primary-900/75">{articleExcerpt(article.content)}</p>
    <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-lazsip-primary-800">Baca artikel <ArrowUpRight aria-hidden className="h-4 w-4" /></span>
  </Link>;
}
