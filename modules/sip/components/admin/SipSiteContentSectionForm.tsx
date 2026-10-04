"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SipLoadingButton } from "@/modules/sip/components/admin/SipLoadingButton";
import { SipImageUploadField } from "@/modules/sip/components/admin/SipImageUploadField";
import { SipToggle } from "@/modules/sip/components/admin/SipToggle";
import { panelClasses } from "@/components/ui/panel";
import type { SipSiteContentSectionKey } from "@/modules/sip/api/siteContent";

export interface FieldDef {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  image?: boolean;
  /** Field on/off — disimpan sebagai "true"/"false". */
  toggle?: boolean;
  /** Sub-judul kecil yang tampil di atas field ini (mengelompokkan field dalam satu section). */
  group?: string;
  /** Lebar penuh walau bukan textarea. */
  wide?: boolean;
}

type SaveStatus = "idle" | "saved" | "error";

const inputBase =
  "w-full bg-white/5 text-sm text-white placeholder:text-white/30 outline-none transition-colors placeholder:text-white/30 focus:bg-white/[0.08] focus:ring-2 focus:ring-sip-lime/60";

export function SipSiteContentSectionForm({
  sectionKey,
  title,
  description,
  previewHref,
  fields,
  initialValue,
  hidden,
  onDirtyChange,
}: {
  sectionKey: SipSiteContentSectionKey;
  title: string;
  description?: string;
  previewHref?: string;
  fields: FieldDef[];
  initialValue: Record<string, string>;
  hidden?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const field of fields) base[field.key] = initialValue[field.key] ?? "";
    return base;
  });
  const [values, setValues] = useState(saved);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  // SipImageUploadField menyimpan preview sendiri — di-remount lewat key saat "Batalkan".
  const [resetCount, setResetCount] = useState(0);

  const dirty = fields.some((field) => values[field.key] !== saved[field.key]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");

    try {
      const res = await fetch(`/api/sip/site-content/${sectionKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: values }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaved(values);
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      hidden={hidden}
      className={panelClasses("min-w-0 p-6 sm:p-8")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-white/50">{description}</p>
          )}
        </div>
        {previewHref && (
          <a
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Lihat di landing page ↗
          </a>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const id = `${sectionKey}-${field.key}`;
          return (
            <Fragment key={field.key}>
              {field.group && (
                <p className="pt-3 text-xs font-semibold uppercase tracking-[0.14em] text-sip-lime/80 sm:col-span-2">
                  {field.group}
                </p>
              )}
              <div
                className={`flex flex-col gap-1.5 ${field.multiline || field.image || field.toggle || field.wide ? "sm:col-span-2" : ""}`}
              >
                {field.toggle ? (
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3.5">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-white">
                        {field.label}
                      </span>
                      {field.hint && (
                        <span className="mt-0.5 block text-xs text-white/40">
                          {field.hint}
                        </span>
                      )}
                    </span>
                    <SipToggle
                      checked={values[field.key] !== "false"}
                      onChange={(checked) =>
                        setField(field.key, checked ? "true" : "false")
                      }
                      label={field.label}
                    />
                  </div>
                ) : field.image ? (
                  <SipImageUploadField
                    key={resetCount}
                    label={field.label}
                    initialUrl={values[field.key] || null}
                    onChange={(url) => setField(field.key, url ?? "")}
                  />
                ) : (
                  <>
                    <label
                      htmlFor={id}
                      className="text-sm font-medium text-white"
                    >
                      {field.label}
                    </label>
                    {field.multiline ? (
                      <textarea
                        id={id}
                        rows={field.rows ?? 4}
                        className={`${inputBase} rounded-2xl p-3.5 leading-relaxed`}
                        value={values[field.key]}
                        onChange={(e) => setField(field.key, e.target.value)}
                      />
                    ) : (
                      <input
                        id={id}
                        className={`${inputBase} h-11 rounded-full px-4`}
                        value={values[field.key]}
                        onChange={(e) => setField(field.key, e.target.value)}
                      />
                    )}
                    {field.hint && (
                      <p className="text-xs text-white/40">{field.hint}</p>
                    )}
                  </>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.04] p-3 pl-4">
        <span
          role="status"
          className={`mr-auto text-sm ${
            status === "error"
              ? "text-red-400"
              : status === "saved"
                ? "text-sip-lime"
                : dirty
                  ? "text-amber-300"
                  : "text-white/40"
          }`}
        >
          {status === "error"
            ? "Gagal menyimpan. Coba lagi."
            : status === "saved"
              ? "Tersimpan — landing page sudah diperbarui."
              : dirty
                ? "Ada perubahan yang belum disimpan."
                : "Belum ada perubahan."}
        </span>
        {dirty && (
          <button
            type="button"
            onClick={() => {
              setValues(saved);
              setStatus("idle");
              setResetCount((n) => n + 1);
            }}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            Batalkan
          </button>
        )}
        <SipLoadingButton
          type="submit"
          variant="lime"
          loading={isSubmitting}
          disabled={!dirty}
        >
          Simpan perubahan
        </SipLoadingButton>
      </div>
    </form>
  );
}
