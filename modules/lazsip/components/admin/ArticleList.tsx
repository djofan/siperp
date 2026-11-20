"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { articleCategory, type LazsipArticle } from "@/contracts/modules/lazsipArticles";
import { panelClasses } from "@/components/ui/panel";

export function ArticleList({ articles }: { articles: LazsipArticle[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function remove(article: LazsipArticle) {
    if (!window.confirm(`Hapus artikel “${article.title}”?`)) return;
    setBusy(article.id); setError("");
    try {
      const response = await fetch(`/api/lazsip/articles/${article.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Artikel belum dapat dihapus. Coba lagi.");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menghapus artikel."); }
    finally { setBusy(null); }
  }
  const filtered = articles.filter(item => `${item.title} ${item.author ?? ""}`.toLowerCase().includes(search.toLowerCase()) && (!status || item.status === status));
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3"><input aria-label="Cari artikel" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul atau penulis..." className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground" /><select aria-label="Filter status" value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"><option value="">Semua status</option><option value="draft">Draft</option><option value="published">Terbit</option></select></div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {!filtered.length && <p className={panelClasses("p-6 text-sm text-foreground/70")}>Belum ada artikel yang cocok. Tambahkan artikel atau ubah pencarian.</p>}
    <div className="grid gap-4 md:grid-cols-2">{filtered.map(item => <div key={item.id} className={panelClasses("flex flex-col gap-3 p-5")}>
      <div className="flex flex-wrap justify-between gap-2 text-xs"><span className="text-foreground/70">{articleCategory(item.category)}</span><span className="rounded-full bg-surface-muted px-3 py-1 font-semibold text-foreground">{item.status === "published" ? "Terbit" : "Draft"}</span></div>
      <h2 className="text-lg font-bold text-foreground">{item.title}</h2>
      {item.author && <p className="text-sm text-foreground/70">Ditulis oleh {item.author}</p>}
      <div className="mt-auto flex flex-wrap gap-2 pt-3"><Link href={`/admin/lazsip/artikel/${item.id}`} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground">Edit</Link>{item.status === "published" && <Link href={`/lazsip/artikel/${item.id}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-4 py-2 text-sm text-foreground">Lihat artikel ↗</Link>}<button type="button" disabled={busy !== null} onClick={() => remove(item)} className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 disabled:opacity-50">{busy === item.id ? "Menghapus..." : "Hapus"}</button></div>
    </div>)}</div>
  </div>;
}
