"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImageUploadField } from "@/components/lazsip/admin/ImageUploadField";
import { Toggle } from "@/components/lazsip/admin/Toggle";
import { LoadingButton } from "@/components/lazsip/admin/LoadingButton";

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

    const url = newsId ? `/api/lazsip/news/${newsId}` : "/api/lazsip/news";
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

    router.push("/admin/lazsip/berita");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="flex flex-col gap-5 rounded-3xl border border-lazsip-primary-100 bg-white p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900">
              Judul<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul berita"
              required
              className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900">
              Isi Berita<span className="ml-0.5 text-red-600">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              required
              placeholder="Tulis isi berita di sini..."
              className="rounded-2xl border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
            />
          </div>

          <ImageUploadField label="Gambar Utama" initialUrl={image} onChange={(url) => setImage(url ?? "")} required={!isEdit} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-3xl border border-lazsip-primary-100 bg-white p-6">
            <div className="flex items-center justify-between rounded-2xl border border-lazsip-primary-100 bg-lazsip-primary-50/60 p-4">
              <span className="text-sm font-medium text-lazsip-primary-900">
                Status: {status === "published" ? "Published" : "Draft"}
              </span>
              <Toggle checked={status === "published"} onChange={(v) => setStatus(v ? "published" : "draft")} label="Status publish" />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-lazsip-primary-100 bg-lazsip-primary-50/60 p-4">
              <span className="text-sm font-medium text-lazsip-primary-900">Pin di beranda</span>
              <Toggle checked={isPinned} onChange={setIsPinned} label="Pin" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <LoadingButton type="submit" loading={isSubmitting}>
            {isEdit ? "Simpan Perubahan" : "Tambah Berita"}
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}
