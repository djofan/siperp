"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImageUploadField } from "@/modules/lazsip/components/admin/ImageUploadField";
import { Toggle } from "@/modules/lazsip/components/admin/Toggle";
import { LoadingButton } from "@/modules/lazsip/components/admin/LoadingButton";
import { panelClasses } from "@/components/ui/panel";

interface ProgramFormValues {
  title: string;
  description: string;
  requirements: string;
  image: string;
  type: string;
  formUrl: string;
  isPinned: boolean;
}

export function ProgramForm({
  programId,
  initialValues,
}: {
  programId?: string;
  initialValues?: Partial<ProgramFormValues>;
}) {
  const router = useRouter();
  const isEdit = !!programId;
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [requirements, setRequirements] = useState(initialValues?.requirements ?? "");
  const [image, setImage] = useState(initialValues?.image ?? "");
  const [type, setType] = useState(initialValues?.type ?? "berita");
  const [formUrl, setFormUrl] = useState(initialValues?.formUrl ?? "");
  const [isPinned, setIsPinned] = useState(initialValues?.isPinned ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isEdit && !image) {
      setError("Gambar program wajib diunggah.");
      return;
    }

    if (type === "daftar" && !formUrl.trim()) {
      setError("Link pendaftaran wajib diisi untuk tipe Pendaftaran.");
      return;
    }

    setIsSubmitting(true);

    const url = programId ? `/api/lazsip/programs/${programId}` : "/api/lazsip/programs";
    const method = programId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        requirements: type === "daftar" ? requirements : "",
        image,
        type,
        formUrl,
        isPinned,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan program.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/lazsip/program");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className={panelClasses("flex flex-col gap-5 p-6")}>
          <ImageUploadField label="Gambar Program" initialUrl={image} onChange={(url) => setImage(url ?? "")} required={!isEdit} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">
              Judul<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Judul program"
              className="rounded-full bg-lazsip-primary-50/70 dark:bg-white/5 px-4 py-2.5 text-sm text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-lazsip-primary-400"
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
              className="rounded-2xl bg-lazsip-primary-50/70 dark:bg-white/5 px-4 py-2.5 text-sm leading-relaxed text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-lazsip-primary-400"
            />
          </div>

          {type === "daftar" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Syarat Pendaftaran</label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
                className="rounded-2xl bg-lazsip-primary-50/70 dark:bg-white/5 px-4 py-2.5 text-sm leading-relaxed text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-lazsip-primary-400"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className={panelClasses("flex flex-col gap-4 p-6")}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Tipe Program</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-full bg-lazsip-primary-50/70 dark:bg-white/5 px-4 py-2.5 text-sm text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-lazsip-primary-400"
              >
                <option value="berita">Berita</option>
                <option value="daftar">Pendaftaran</option>
              </select>
            </div>

            {type === "daftar" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">
                  Link Pendaftaran<span className="ml-0.5 text-red-600">*</span>
                </label>
                <input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://forms.gle/... atau https://wa.me/..."
                  className="rounded-full bg-lazsip-primary-50/70 dark:bg-white/5 px-4 py-2.5 text-sm text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-lazsip-primary-400"
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-2xl bg-lazsip-primary-50/60 dark:bg-white/5 p-4">
              <span className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Pin di halaman Program</span>
              <Toggle checked={isPinned} onChange={setIsPinned} label="Pin" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <LoadingButton type="submit" loading={isSubmitting}>
            {isEdit ? "Simpan Perubahan" : "Tambah Program"}
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}
