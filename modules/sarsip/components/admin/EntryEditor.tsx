"use client";
import { describeApiProblem } from "@/lib/api-problem";
import { FileText, ImagePlus, UploadCloud, Settings2, Save, ArrowUpRight, Archive, X } from "lucide-react";
import Link from "next/link";
import styles from "./Admin.module.css";
import { RupiahNumberInput } from "@/components/ui/RupiahNumberInput";

import { GalleryEditor } from "./GalleryEditor";
import type { SarsipGalleryPhoto } from "@/contracts/modules/sarsip";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
type Entry = { gallery?: SarsipGalleryPhoto[]; id: string; title: string; description: string; location: string | null; image: string | null; eventDate: string; targetAmount: number; status: string };
export function EntryEditor({ kind, entry }: { kind: string; entry?: Entry }) {
  const router = useRouter();
  const [gallery, setGallery] = useState(entry?.gallery ?? []);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmArchive,setConfirmArchive]=useState(false);
  const [image, setImage] = useState(entry?.image ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  const field = styles.input;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || galleryBusy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError("");
    try {
      let imageUrl = image;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        const uploaded = await fetch("/api/sarsip/upload", { method: "POST", body: form });
        const result = await uploaded.json().catch(()=>null);
        if (!uploaded.ok || typeof result?.url!=="string") throw new Error(describeApiProblem(result,uploaded.status,"Gagal mengunggah gambar."));
        imageUrl = result.url;
        setImage(imageUrl); setFile(null); setPreview("");
        if (fileInput.current) fileInput.current.value = "";
      }
      const response = await fetch(entry ? `/api/sarsip/entries/${entry.id}` : "/api/sarsip/entries", {
        method: entry ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, kind, image: imageUrl, gallery }),
      });
      const data = await response.json().catch(()=>null);
      if (!response.ok) throw new Error(describeApiProblem(data,response.status,"Gagal menyimpan konten."));
      router.push(`/admin/sarsip/${kind}`); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan."); }
    finally { setBusy(false); }
  }
  async function archive() {
    if (!entry || busy || galleryBusy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/sarsip/entries/${entry.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(describeApiProblem(await response.json().catch(()=>null),response.status,"Gagal mengarsipkan konten."));
      router.push(`/admin/sarsip/${kind}`); router.refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  const required=<span aria-hidden="true" className={styles.required}>*</span>;
  return <form onSubmit={submit} className={styles.editor}>
    <fieldset disabled={busy} className={styles.editorMain}>
      <section className={styles.panel}><header className={styles.panelHead}><div><h2><FileText size={17}/>Isi {kind==="berita"?"berita":"konten"}</h2><p>Informasi utama yang dibaca pengunjung di halaman publik.</p></div><span className={styles.sectionNumber}>01</span></header><div className={styles.fields}>
        <label className={styles.field}>Judul {required}<input name="title" required maxLength={191} defaultValue={entry?.title} placeholder={kind==="campaign"?"Contoh: Bantuan logistik untuk warga terdampak":"Tulis judul yang jelas dan informatif"} className={field}/></label>
        <label className={styles.field}>{kind==="berita"?"Isi berita":"Deskripsi"} {required}<textarea name="description" required maxLength={50000} rows={10} defaultValue={entry?.description} placeholder="Ceritakan latar belakang, pelaksanaan, dan informasi yang perlu diketahui pembaca…" className={field}/><small className={styles.hint}>Gunakan paragraf singkat agar informasi mudah dibaca.</small></label>
        <div className={styles.gridTwo}><label className={styles.field}>Lokasi<input name="location" maxLength={191} defaultValue={entry?.location??""} placeholder="Kota atau lokasi kegiatan" className={field}/></label><label className={styles.field}>Tanggal {kind==="berita"?"berita":"pelaksanaan"}<input name="eventDate" type="date" defaultValue={entry?.eventDate} className={field}/><small className={styles.hint}>Pilih tanggal yang akan ditampilkan pada konten.</small></label></div>
      </div></section>
      <section className={styles.panel}><header className={styles.panelHead}><div><h2><ImagePlus size={17}/>Gambar & dokumentasi</h2><p>Foto utama dan galeri membantu pengunjung memahami kegiatan.</p></div><span className={styles.sectionNumber}>02</span></header>
        <label className={styles.upload}><UploadCloud size={25}/><span>{preview||image?"Ganti foto utama":"Pilih foto utama"}<small>JPG, PNG, WebP, GIF, BMP, atau AVIF · maksimal 10 MB · opsional</small></span><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif" disabled={busy||galleryBusy} className="sr-only" onChange={event=>{
          const selected=event.target.files?.[0];if(!selected)return;
          if(!["image/jpeg","image/png","image/webp","image/gif","image/bmp","image/avif"].includes(selected.type)||selected.size>10*1024*1024||selected.size===0){setError("Pilih gambar JPG, PNG, WebP, GIF, BMP, atau AVIF, maksimal 10 MB.");event.target.value="";return;}
          setError("");setFile(selected);setPreview(URL.createObjectURL(selected));
        }}/></label>
        {(preview||image)&&<div className="mt-4"><div className={styles.cover}><Image unoptimized src={preview||image} alt="Pratinjau foto dokumentasi" width={800} height={450}/></div><div className={styles.coverActions}><small className={styles.hint}>Foto utama konten publik</small><button type="button" disabled={busy||galleryBusy} className={styles.danger} onClick={()=>{setImage("");setFile(null);setPreview("");if(fileInput.current)fileInput.current.value="";}}><X size={13}/>Hapus foto</button></div></div>}
        <div className="mt-5"><GalleryEditor value={gallery} onChange={setGallery} disabled={busy||galleryBusy} onUploadingChange={setGalleryBusy}/></div>
      </section>
    </fieldset>
    <aside className={styles.editorAside}>
      <section className={styles.panel}><header className={styles.panelHead}><div><h2><Settings2 size={17}/>Pengaturan publikasi</h2><p>Simpan sebagai draf atau tampilkan untuk pengunjung.</p></div></header><div className={styles.fields}>
        <label className={styles.field}>Status {required}<select name="status" required defaultValue={entry?.status??"draft"} className={field}><option value="draft">Draf — belum tampil publik</option><option value="published">{kind==="campaign"?"Publik — donasi dibuka":"Dipublikasikan"}</option>{(kind!=="berita"||entry?.status==="completed")&&<option value="completed">Selesai</option>}{entry?.status==="archived"&&<option value="archived">Diarsipkan</option>}</select></label>
        {kind==="campaign"&&<label className={styles.field}>Target donasi (Rp) {required}<RupiahNumberInput name="targetAmount" required type="number" step="1" min="1" max="2147483647" defaultValue={entry?.targetAmount||""} placeholder="Contoh: 50.000.000" className={field}/></label>}
        <div className={styles.notice}><strong>Periksa sebelum menyimpan</strong>Pastikan judul, isi, foto, dan tanggal sudah sesuai. Draf dan arsip hanya terlihat oleh admin.</div>
        {error&&<p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.saveStack}><button type="submit" disabled={busy||galleryBusy} className={styles.primary}><Save size={15}/>{galleryBusy?"Menunggu unggahan…":busy?"Menyimpan…":entry?"Simpan perubahan":"Simpan konten"}</button>{entry&&["published","completed"].includes(entry.status)&&<Link href={`/sarsip/${kind}/${entry.id}`} className={styles.secondary}><ArrowUpRight size={15}/>Lihat halaman publik</Link>}</div>
      </div></section>
      {entry&&entry.status!=="archived"&&<section className={styles.panel}>{confirmArchive?<div className={styles.fields}><div className={styles.notice}><strong>Arsipkan konten ini?</strong>Konten tidak lagi tampil publik. Riwayat transaksi tetap tersimpan.</div><button type="button" disabled={busy||galleryBusy} onClick={()=>void archive()} className={styles.danger}>Ya, arsipkan</button><button type="button" disabled={busy} onClick={()=>setConfirmArchive(false)} className={styles.secondary}>Batal</button></div>:<button type="button" disabled={busy||galleryBusy} onClick={()=>setConfirmArchive(true)} className={styles.secondary}><Archive size={15}/>Arsipkan konten</button>}</section>}
    </aside>
  </form>;
}
