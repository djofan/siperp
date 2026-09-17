"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SipImageUploadField } from "@/modules/sip/components/admin/SipImageUploadField";
import { SipToggle } from "@/modules/sip/components/admin/SipToggle";
import { SipLoadingButton } from "@/modules/sip/components/admin/SipLoadingButton";
import { staticPanelClasses } from "@/components/ui/panel";

interface NewsFormValues {
  title: string;
  content: string;
  image: string;
  isPinned: boolean;
  status: string;
}

export function NewsForm({
  newsId,
  initialValues,
}: {
  newsId?: string;
  initialValues?: Partial<NewsFormValues>;
}) {
  const router = useRouter();
  const isEdit = !!newsId;
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [image, setImage] = useState(initialValues?.image ?? "");
  const [isPinned, setIsPinned] = useState(initialValues?.isPinned ?? false);
  const [status, setStatus] = useState(initialValues?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isEdit && !image) {
      setError("Gambar utama wajib diunggah.");
      return;
    }

    setIsSubmitting(true);

    const url = newsId ? `/api/sip/news/${newsId}` : "/api/sip/news";
    const method = newsId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, image, isPinned, status }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan berita.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/sip/berita");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className={staticPanelClasses("p-6 sm:p-8")}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-sip-primary-900">
              Judul<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul berita"
              required
              className="rounded-full border border-sip-primary-200 bg-white px-4 py-2.5 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-sip-primary-900">
              Isi Berita<span className="ml-0.5 text-red-600">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              required
              placeholder="Tulis isi berita di sini..."
              className="rounded-2xl border border-sip-primary-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <div className="sm:col-span-2">
            <SipImageUploadField label="Gambar Utama" initialUrl={image} onChange={(url) => setImage(url ?? "")} required={!isEdit} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-sip-primary-100 pt-6 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl bg-sip-primary-50/60 px-4 py-3.5">
            <span className="text-sm font-medium text-sip-primary-900">
              Status: {status === "published" ? "Published" : "Draft"}
            </span>
            <SipToggle checked={status === "published"} onChange={(v) => setStatus(v ? "published" : "draft")} label="Status publish" />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-sip-primary-50/60 px-4 py-3.5">
            <span className="text-sm font-medium text-sip-primary-900">Pin di beranda</span>
            <SipToggle checked={isPinned} onChange={setIsPinned} label="Pin" />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-center justify-end gap-4 sm:flex-row">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <SipLoadingButton type="submit" loading={isSubmitting} className="w-full sm:w-auto">
          {isEdit ? "Simpan Perubahan" : "Tambah Berita"}
        </SipLoadingButton>
      </div>
    </form>
  );
}
