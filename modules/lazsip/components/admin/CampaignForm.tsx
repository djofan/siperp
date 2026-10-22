"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImageUploadField } from "@/modules/lazsip/components/admin/ImageUploadField";
import { Toggle } from "@/modules/lazsip/components/admin/Toggle";
import { LoadingButton } from "@/modules/lazsip/components/admin/LoadingButton";
import { panelClasses } from "@/components/ui/panel";
import type { CampaignDocumentationPhoto } from "@/lib/domain";

interface CampaignFormValues {
  documentationPhotos: CampaignDocumentationPhoto[];
  title: string;
  description: string;
  targetAmount: string;
  image: string;
  uniqueCode: string;
  isPinned: boolean;
  status: string;
}

export function CampaignForm({
  campaignId,
  initialValues,
}: {
  campaignId?: string;
  initialValues?: Partial<CampaignFormValues>;
}) {
  const router = useRouter();
  const isEdit = !!campaignId;
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [targetAmount, setTargetAmount] = useState(initialValues?.targetAmount ?? "");
  const [image, setImage] = useState(initialValues?.image ?? "");
  const [uniqueCode, setUniqueCode] = useState(initialValues?.uniqueCode ?? "");
  const [isPinned, setIsPinned] = useState(initialValues?.isPinned ?? false);
  const [status, setStatus] = useState(initialValues?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentationPhotos,setDocumentationPhotos]=useState<CampaignDocumentationPhoto[]>(initialValues?.documentationPhotos??[]);
  const [uploads,setUploads]=useState<Record<string,boolean>>({});
  const uploading=Object.values(uploads).some(Boolean);
  function updatePhoto(id:string,patch:Partial<CampaignDocumentationPhoto>){setDocumentationPhotos(items=>items.map(item=>item.id===id?{...item,...patch}:item));}
  function movePhoto(index:number,direction:number){setDocumentationPhotos(items=>{const next=[...items],target=index+direction;if(target<0||target>=next.length)return items;[next[index],next[target]]=[next[target],next[index]];return next;});}

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if(uploading){setError("Tunggu hingga seluruh foto selesai diunggah.");return;}
    if(documentationPhotos.some(photo=>!photo.image)){setError("Unggah foto untuk setiap dokumentasi, atau hapus baris yang masih kosong.");return;}

    if (!isEdit && !image) {
      setError("Gambar campaign wajib diunggah.");
      return;
    }

    setIsSubmitting(true);

    const url = campaignId ? `/api/lazsip/campaigns/${campaignId}` : "/api/lazsip/campaigns";
    const method = campaignId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, targetAmount: Number(targetAmount), image, uniqueCode, isPinned, status, documentationPhotos }),
    }).catch(()=>null);

    if(!response){setError("Koneksi terputus. Isian tetap tersimpan, silakan coba lagi.");setIsSubmitting(false);return;}

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(typeof data?.error==="string"?data.error:data?.error?.message??"Gagal menyimpan campaign.");
      setIsSubmitting(false);
      return;
    }

    // Edit balik ke halaman Kelola Campaign (riwayat & saldo) campaign ini, bukan ke
    // daftar — form edit cuma langkah sesaat di dalam alur kelola satu campaign.
    // Tambah baru tetap balik ke daftar seperti form lain.
    router.push(campaignId ? `/admin/lazsip/donasi/${campaignId}` : "/admin/lazsip/donasi");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <div className={panelClasses("flex flex-col gap-4 p-5")}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">
              Judul Campaign<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Judul campaign donasi"
              className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/35 dark:focus:ring-lazsip-primary-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">
              Deskripsi<span className="ml-0.5 text-red-600">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              required
              className="rounded-2xl border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-lazsip-primary-500"
            />
          </div>

          <ImageUploadField label="Gambar Campaign" initialUrl={image} onChange={(url) => setImage(url ?? "")} onUploadingChange={busy=>setUploads(items=>({...items,cover:busy}))} required={!isEdit} />
        </div>

        <div className="flex flex-col gap-5">
          <div className={panelClasses("flex flex-col gap-3.5 p-5")}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">
                Target Nominal (Rp)<span className="ml-0.5 text-red-600">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-lazsip-primary-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">
                Kode Unik<span className="ml-0.5 text-red-600">*</span>
              </label>
              <input
                required
                inputMode="numeric"
                maxLength={2}
                placeholder="mis. 07"
                value={uniqueCode}
                onChange={(e) => setUniqueCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-lazsip-primary-500"
              />
              <p className="text-xs text-lazsip-primary-800/50 dark:text-white/45">
                2 digit angka, unik antar campaign. Otomatis ditempel di digit belakang nominal donasi supaya mudah dikenali saat rekonsiliasi transfer di rekening bersama.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 dark:border-white/10 dark:bg-[#16191a] dark:text-white dark:focus:ring-lazsip-primary-500"
              >
                <option value="active" className="bg-white text-lazsip-primary-900 dark:bg-[#16191a] dark:text-white">Aktif</option>
                <option value="completed" className="bg-white text-lazsip-primary-900 dark:bg-[#16191a] dark:text-white">Selesai</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-lazsip-primary-50/60 p-4 dark:bg-white/5">
              <span className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Pin di halaman Donasi</span>
              <Toggle checked={isPinned} onChange={setIsPinned} label="Pin" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <LoadingButton type="submit" loading={isSubmitting} disabled={uploading}>
            {isEdit ? "Simpan Perubahan" : "Tambah Campaign"}
          </LoadingButton>
        </div>
      </div>
      <section className={panelClasses("p-5")} aria-label="Galeri dokumentasi campaign">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-lazsip-primary-900 dark:text-white">Galeri dokumentasi campaign</h3><p className="mt-2 text-xs leading-6 text-lazsip-primary-800/60 dark:text-white/50">Tampil di bawah form donasi, sebelum Campaign Lainnya. Tambahkan foto, keterangan, lalu atur urutannya. Jangan unggah data pribadi sensitif.</p></div><button type="button" className="rounded-full bg-lazsip-primary-50 px-4 py-2 text-xs font-semibold text-lazsip-primary-900 dark:bg-white/10 dark:text-white" onClick={()=>setDocumentationPhotos(items=>[...items,{id:crypto.randomUUID(),image:"",caption:"",isDemo:false}])}>+ Tambah foto</button></div>
        {!documentationPhotos.length&&<p className="mt-5 text-xs text-lazsip-primary-800/50 dark:text-white/45">Belum ada dokumentasi. Galeri tidak tampil jika kosong.</p>}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">{documentationPhotos.map((photo,index)=><div key={photo.id} className="rounded-2xl bg-lazsip-primary-50/50 p-4 dark:bg-white/5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-lazsip-primary-900 dark:text-white">Foto {index+1}{photo.isDemo?" · Contoh / dummy":""}</span><div className="flex gap-2"><button type="button" disabled={index===0||isSubmitting} onClick={()=>movePhoto(index,-1)} aria-label={`Majukan foto ${index+1}`} className="rounded-full border border-lazsip-primary-200 px-2 py-1 text-xs disabled:opacity-30 dark:border-white/15">←</button><button type="button" disabled={index===documentationPhotos.length-1||isSubmitting} onClick={()=>movePhoto(index,1)} aria-label={`Mundurkan foto ${index+1}`} className="rounded-full border border-lazsip-primary-200 px-2 py-1 text-xs disabled:opacity-30 dark:border-white/15">→</button><button type="button" disabled={uploads[photo.id]||isSubmitting} onClick={()=>setDocumentationPhotos(items=>items.filter(item=>item.id!==photo.id))} aria-label={`Hapus dokumentasi foto ${index+1}`} className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700 disabled:opacity-40 dark:bg-red-400/10 dark:text-red-300">Hapus</button></div></div><ImageUploadField label={`Foto dokumentasi ${index+1}`} initialUrl={photo.image} onChange={url=>updatePhoto(photo.id,{image:url??"",isDemo:false})} onUploadingChange={busy=>setUploads(items=>({...items,[photo.id]:busy}))}/><label className="mt-4 block text-xs text-lazsip-primary-900 dark:text-white" htmlFor={`caption-${photo.id}`}>Keterangan foto</label><textarea id={`caption-${photo.id}`} value={photo.caption??""} maxLength={500} rows={2} placeholder="Contoh: Penyerahan bantuan di lokasi penerima" onChange={event=>updatePhoto(photo.id,{caption:event.target.value})} className="mt-2 w-full resize-none rounded-xl border border-lazsip-primary-200 bg-white px-3 py-2 text-xs text-lazsip-primary-900 dark:border-white/10 dark:bg-white/5 dark:text-white"/></div>)}</div>
        {documentationPhotos.length>0&&<div className="mt-5"><LoadingButton type="submit" loading={isSubmitting} disabled={uploading}>Simpan campaign dan galeri</LoadingButton></div>}
      </section>
    </form>
  );
}
