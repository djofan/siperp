export interface LazsipArticle {
  id: string;
  title: string;
  content: string;
  author: string | null;
  source: string | null;
  category: string | null;
  status: "draft" | "published";
  createdAt: Date;
}

export const ARTICLE_CATEGORIES = [
  { value: "zakat", label: "Fiqih Zakat" },
  { value: "qurban", label: "Fiqih Qurban" },
  { value: "infak_sedekah", label: "Infak & Sedekah" },
  { value: "lainnya", label: "Panduan Lainnya" },
];
export function articleCategory(value: string | null) {
  return ARTICLE_CATEGORIES.find(item => item.value === value)?.label ?? "Artikel & Panduan";
}
export function articleExcerpt(content: string) {
  return content.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[#*>_`]/g, "").replace(/\s+/g, " ").trim();
}
