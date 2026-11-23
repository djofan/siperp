"use client";

import { describeApiProblem } from "@/lib/api-problem";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ARTICLE_CATEGORIES, type LazsipArticle } from "@/contracts/modules/lazsipArticles";
import { panelClasses } from "@/components/ui/panel";
import { LoadingButton } from "@/modules/lazsip/components/admin/LoadingButton";

const fieldClass = "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent";

export function ArticleForm({ article }: { article?: LazsipArticle }) {
  const router = useRouter();
  const body = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(article?.content ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function insert(sample: string) {
    const el = body.current;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? start;
    setContent(content.slice(0, start) + sample + content.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + sample.length, start + sample.length); });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/lazsip/articles${article ? `/${article.id}` : ""}`, {
        method: article ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: String(data.get("title")).trim(), content: content.trim(), author: String(data.get("author")).trim() || null, source: String(data.get("source")).trim() || null, category: data.get("category") || null, status: data.get("status") }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(describeApiProblem(result, 0, "Gagal menyimpan artikel. Periksa isian lalu coba lagi."));
      }
      router.push("/admin/lazsip/artikel"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan artikel."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className={panelClasses("mx-auto flex max-w-4xl flex-col gap-5 p-5 sm:p-7")}>
    <label className="space-y-2 text-sm font-medium text-foreground"><span>Judul <span className="text-red-600">*</span></span><input name="title" defaultValue={article?.title} required maxLength={191} className={fieldClass} placeholder="Contoh: Siapa saja yang berhak menerima zakat?" /></label>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-medium text-foreground"><span>Penulis <span className="font-normal opacity-60">(opsional)</span></span><input name="author" defaultValue={article?.author ?? ""} maxLength={191} className={fieldClass} placeholder="Nama penulis atau tim penyusun" /></label>
      <label className="space-y-2 text-sm font-medium text-foreground"><span>Kategori <span className="font-normal opacity-60">(opsional)</span></span><select name="category" defaultValue={article?.category ?? ""} className={fieldClass}><option value="">Tanpa kategori</option>{ARTICLE_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    </div>
    <div className="space-y-2">
      <label htmlFor="article-content" className="text-sm font-medium text-foreground">Isi artikel <span className="text-red-600">*</span></label>
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Format artikel">{[{ label: "Subjudul", sample: "\n\n## Subjudul\n\n" }, { label: "Daftar", sample: "\n\n- Poin pertama\n- Poin kedua\n\n" }, { label: "Kutipan", sample: "\n\n> Kutipan dalil atau rujukan\n\n" }, { label: "Tautan", sample: "[Nama sumber](https://contoh.id)" }].map(item => <button key={item.label} type="button" onClick={() => insert(item.sample)} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-muted">{item.label}</button>)}</div>
      <textarea id="article-content" ref={body} value={content} onChange={event => setContent(event.target.value)} rows={16} required maxLength={1000000} className={fieldClass} placeholder="Tulis isi artikel di sini..." />
      <p className="text-xs text-foreground/70">Gunakan tombol format untuk subjudul, daftar, kutipan, dan tautan. Cuplikan card dibuat otomatis dari isi.</p>
    </div>
    <label className="space-y-2 text-sm font-medium text-foreground"><span>Sumber / Rujukan <span className="font-normal opacity-60">(opsional)</span></span><textarea name="source" defaultValue={article?.source ?? ""} rows={3} maxLength={10000} className={fieldClass} placeholder="Nama kitab, penulis, halaman, atau [Nama situs](https://...). Bisa lebih dari satu rujukan." /></label>
    <label className="space-y-2 text-sm font-medium text-foreground"><span>Status</span><select name="status" defaultValue={article?.status ?? "draft"} className={fieldClass}><option value="draft">Draft — hanya terlihat di admin</option><option value="published">Terbit — tampil di website</option></select></label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex flex-wrap items-center justify-end gap-3"><button type="button" disabled={busy} onClick={() => router.push("/admin/lazsip/artikel")} className="rounded-full border border-border px-5 py-3 text-sm text-foreground">Batal</button><LoadingButton type="submit" loading={busy}>Simpan Artikel</LoadingButton></div>
  </form>;
}
