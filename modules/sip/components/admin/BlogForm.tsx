"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SipImageUploadField } from "@/modules/sip/components/admin/SipImageUploadField";
import { SipToggle } from "@/modules/sip/components/admin/SipToggle";
import { SipLoadingButton } from "@/modules/sip/components/admin/SipLoadingButton";

interface BlogFormValues {
  title: string;
  content: string;
  image: string;
  isPinned: boolean;
  status: string;
}

export function BlogForm({
  blogId,
  initialValues,
}: {
  blogId?: string;
  initialValues?: Partial<BlogFormValues>;
}) {
  const router = useRouter();
  const isEdit = !!blogId;
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

    const url = blogId ? `/api/sip/blog/${blogId}` : "/api/sip/blog";
    const method = blogId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, image, isPinned, status }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan artikel.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/sip/blog");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="flex flex-col gap-5 rounded-3xl border border-sip-primary-100 bg-white p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">
              Judul<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul artikel"
              required
              className="rounded-full border border-sip-primary-200 bg-white px-4 py-2.5 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-sip-primary-900">
              Isi Artikel<span className="ml-0.5 text-red-600">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              required
              placeholder="Tulis isi artikel di sini..."
              className="rounded-2xl border border-sip-primary-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
            />
          </div>

          <SipImageUploadField label="Gambar Utama" initialUrl={image} onChange={(url) => setImage(url ?? "")} required={!isEdit} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-3xl border border-sip-primary-100 bg-white p-6">
            <div className="flex items-center justify-between rounded-2xl border border-sip-primary-100 bg-sip-primary-50/60 p-4">
              <span className="text-sm font-medium text-sip-primary-900">
                Status: {status === "published" ? "Published" : "Draft"}
              </span>
              <SipToggle checked={status === "published"} onChange={(v) => setStatus(v ? "published" : "draft")} label="Status publish" />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-sip-primary-100 bg-sip-primary-50/60 p-4">
              <span className="text-sm font-medium text-sip-primary-900">Pin di beranda</span>
              <SipToggle checked={isPinned} onChange={setIsPinned} label="Pin" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <SipLoadingButton type="submit" loading={isSubmitting}>
            {isEdit ? "Simpan Perubahan" : "Tambah Artikel"}
          </SipLoadingButton>
        </div>
      </div>
    </form>
  );
}
