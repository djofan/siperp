"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImageUploadField } from "@/modules/lazsip/components/admin/ImageUploadField";
import { Toggle } from "@/modules/lazsip/components/admin/Toggle";
import { LoadingButton } from "@/modules/lazsip/components/admin/LoadingButton";
import { panelClasses } from "@/components/ui/panel";

interface CampaignFormValues {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

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
      body: JSON.stringify({ title, description, targetAmount: Number(targetAmount), image, uniqueCode, isPinned, status }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan campaign.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/lazsip/donasi");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className={panelClasses("flex flex-col gap-5 p-6")}>
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

          <ImageUploadField label="Gambar Campaign" initialUrl={image} onChange={(url) => setImage(url ?? "")} required={!isEdit} />
        </div>

        <div className="flex flex-col gap-5">
          <div className={panelClasses("flex flex-col gap-4 p-6")}>
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
                value={uniqueCode}
                onChange={(e) => setUniqueCode(e.target.value.toUpperCase())}
                className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-lazsip-primary-500"
              />
              <p className="text-xs text-lazsip-primary-800/50 dark:text-white/45">Dipakai rekonsiliasi — semua campaign settle ke satu rekening bersama.</p>
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

          <LoadingButton type="submit" loading={isSubmitting}>
            {isEdit ? "Simpan Perubahan" : "Tambah Campaign"}
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}
