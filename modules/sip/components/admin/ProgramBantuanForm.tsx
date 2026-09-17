"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SipImageUploadField } from "@/modules/sip/components/admin/SipImageUploadField";
import { SipToggle } from "@/modules/sip/components/admin/SipToggle";
import { SipLoadingButton } from "@/modules/sip/components/admin/SipLoadingButton";
import { slugify } from "@/modules/sip/api/slugify";
import { staticPanelClasses } from "@/components/ui/panel";

interface ProgramBantuanFormValues {
  title: string;
  slug: string;
  description: string;
  image: string;
  campaignUrl: string;
  isPinned: boolean;
}

export function ProgramBantuanForm({
  programId,
  initialValues,
}: {
  programId?: string;
  initialValues?: Partial<ProgramBantuanFormValues>;
}) {
  const router = useRouter();
  const isEdit = !!programId;
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [image, setImage] = useState(initialValues?.image ?? "");
  const [campaignUrl, setCampaignUrl] = useState(initialValues?.campaignUrl ?? "");
  const [isPinned, setIsPinned] = useState(initialValues?.isPinned ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isEdit && !image) {
      setError("Gambar program wajib diunggah.");
      return;
    }

    setIsSubmitting(true);

    const url = programId ? `/api/sip/program-bantuan/${programId}` : "/api/sip/program-bantuan";
    const method = programId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, description, image, campaignUrl, isPinned }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan program.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/sip/program-bantuan");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className={staticPanelClasses("p-6 sm:p-8")}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">
              Judul<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              placeholder="mis. Bantuan Kesehatan"
              className="rounded-full border border-sip-primary-200 bg-white px-4 py-2.5 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">
              Slug (URL)<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
              placeholder="bantuan-kesehatan"
              className="rounded-full border border-sip-primary-200 bg-white px-4 py-2.5 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-sip-primary-900">
              Deskripsi<span className="ml-0.5 text-red-600">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              required
              className="rounded-2xl border border-sip-primary-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <div className="sm:col-span-2">
            <SipImageUploadField label="Gambar Program" initialUrl={image} onChange={(url) => setImage(url ?? "")} required={!isEdit} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-sip-primary-100 pt-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">Link Campaign LAZSIP (opsional)</label>
            <input
              value={campaignUrl}
              onChange={(e) => setCampaignUrl(e.target.value)}
              placeholder="/lazsip/donasi/xxxxx"
              className="rounded-full border border-sip-primary-200 bg-white px-4 py-2.5 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
            <p className="text-xs text-sip-primary-800/50">
              Tombol &quot;Infaq untuk program ini&quot; akan mengarah ke link ini. Kosongkan kalau belum ada campaign terkait.
            </p>
          </div>

          <div className="flex items-center justify-between self-start rounded-2xl bg-sip-primary-50/60 px-4 py-3.5">
            <span className="text-sm font-medium text-sip-primary-900">Pin di halaman Program</span>
            <SipToggle checked={isPinned} onChange={setIsPinned} label="Pin" />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-center justify-end gap-4 sm:flex-row">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <SipLoadingButton type="submit" loading={isSubmitting} className="w-full sm:w-auto">
          {isEdit ? "Simpan Perubahan" : "Tambah Program"}
        </SipLoadingButton>
      </div>
    </form>
  );
}
