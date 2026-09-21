"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
type Entry = { id: string; title: string; description: string; location: string | null; image: string | null; eventDate: string; targetAmount: number; status: string };
export function EntryEditor({ kind, entry }: { kind: string; entry?: Entry }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState(entry?.image ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  const field = "mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-orange-500";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError("");
    try {
      let imageUrl = image;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        const uploaded = await fetch("/api/sarsip/upload", { method: "POST", body: form });
        const result = await uploaded.json();
        if (!uploaded.ok) throw new Error(result.error ?? "Gagal mengunggah gambar.");
        imageUrl = result.url;
        setImage(imageUrl); setFile(null); setPreview("");
        if (fileInput.current) fileInput.current.value = "";
      }
      const response = await fetch(entry ? `/api/sarsip/entries/${entry.id}` : "/api/sarsip/entries", {
        method: entry ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, kind, image: imageUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan.");
      router.push(`/admin/sarsip/${kind}`); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan."); }
    finally { setBusy(false); }
  }
  async function archive() {
    if (!entry || !confirm("Arsipkan konten ini dari halaman publik? Riwayat transaksi tetap tersimpan.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/sarsip/entries/${entry.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Gagal mengarsipkan konten.");
      router.push(`/admin/sarsip/${kind}`); router.refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="max-w-3xl space-y-5 rounded-2xl border border-border bg-surface p-6 text-foreground">
    <label className="block text-sm font-medium">Judul<input name="title" required maxLength={191} defaultValue={entry?.title} className={field}/></label>
    <label className="block text-sm font-medium">{kind === "berita" ? "Isi berita" : "Deskripsi"}<textarea name="description" required maxLength={50000} rows={9} defaultValue={entry?.description} className={field}/></label>
    <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Lokasi<input name="location" maxLength={191} defaultValue={entry?.location ?? ""} className={field}/></label><label className="block text-sm font-medium">Tanggal {kind === "berita" ? "berita" : kind === "kegiatan" ? "kegiatan" : "pelaksanaan"}<input name="eventDate" type="date" defaultValue={entry?.eventDate} className={field}/></label></div>
    <div className="space-y-3">
      <label className="block text-sm font-medium">Foto dokumentasi
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className={field} onChange={(event) => {
          const selected = event.target.files?.[0];
          if (!selected) return;
          if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || selected.size > 2 * 1024 * 1024 || selected.size === 0) {
            setError("Pilih gambar JPG, PNG, atau WebP, maksimal 2 MB.");
            event.target.value = "";
            return;
          }
          setError(""); setFile(selected); setPreview(URL.createObjectURL(selected));
        }}/>
        <span className="mt-1 block text-xs font-normal text-foreground/50">Opsional. JPG, PNG, atau WebP, maksimal 2 MB. Gambar diunggah saat disimpan.</span>
      </label>
      {(preview || image) && <><Image unoptimized src={preview || image} alt="Pratinjau foto dokumentasi" width={480} height={270} className="max-h-64 w-auto max-w-full rounded-xl object-contain"/><button type="button" disabled={busy} className="text-sm text-red-600" onClick={() => {
        setImage(""); setFile(null); setPreview("");
        if (fileInput.current) fileInput.current.value = "";
      }}>Hapus gambar</button></>}
    </div>
    {kind === "campaign" && <label className="block text-sm font-medium">Target donasi (Rp)<input name="targetAmount" required type="number" step="1" min="1" max="2147483647" defaultValue={entry?.targetAmount || ""} className={field}/></label>}
    <label className="block text-sm font-medium">Status<select name="status" defaultValue={entry?.status ?? "draft"} className={field}><option value="draft">Draft — belum tampil publik</option><option value="published">{kind === "campaign" ? "Publik — donasi dibuka" : "Dipublikasikan"}</option>{(kind !== "berita" || entry?.status === "completed") && <option value="completed">Selesai</option>}{entry?.status === "archived" && <option value="archived">Diarsipkan</option>}</select></label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Memproses…" : "Simpan"}</button>{entry && entry.status !== "archived" && <button type="button" disabled={busy} onClick={archive} className="rounded-full border border-border px-6 py-3 text-sm disabled:opacity-50">Arsipkan</button>}</div>
  </form>;
}
