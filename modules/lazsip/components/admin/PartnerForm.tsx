"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImageUploadField } from "@/modules/lazsip/components/admin/ImageUploadField";
import { LoadingButton } from "@/modules/lazsip/components/admin/LoadingButton";
import { staticPanelClasses } from "@/components/ui/panel";

export function PartnerForm({
  partnerId,
  initialValues,
}: {
  partnerId?: string;
  initialValues?: { name: string; logo: string; url: string };
}) {
  const router = useRouter();
  const isEdit = !!partnerId;
  const [name, setName] = useState(initialValues?.name ?? "");
  const [logo, setLogo] = useState(initialValues?.logo ?? "");
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const apiUrl = partnerId ? `/api/lazsip/partners/${partnerId}` : "/api/lazsip/partners";
    const method = partnerId ? "PUT" : "POST";

    const response = await fetch(apiUrl, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, logo, url }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan mitra.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/lazsip/mitra");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={staticPanelClasses("flex max-w-xl flex-col gap-5 p-6")}>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-lazsip-primary-900">
          Nama Mitra<span className="ml-0.5 text-red-600">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
        />
      </div>

      <ImageUploadField label="Logo Mitra" initialUrl={logo} onChange={(u) => setLogo(u ?? "")} required={!isEdit} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-lazsip-primary-900">Tautan Website</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
          className="rounded-full border border-lazsip-primary-200 bg-white px-4 py-2.5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <LoadingButton type="submit" loading={isSubmitting}>
        {isEdit ? "Simpan Perubahan" : "Tambah Mitra"}
      </LoadingButton>
    </form>
  );
}
