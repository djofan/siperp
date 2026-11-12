"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, Input } from "@/components/ui/FormField";
import { LoadingButton } from "@/modules/lazsip/components/admin/LoadingButton";
import { panelClasses } from "@/components/ui/panel";
import type { SiteContentSectionKey } from "@/modules/lazsip/api/siteContent";

export interface FieldDef {
  options?: { value: string; label: string }[];
  key: string;
  label: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  required?: boolean;
  type?: "text"|"email"|"tel"|"url";
}

export function SiteContentSectionForm({
  sectionKey,
  title,
  description,
  fields,
  initialValue,
}: {
  sectionKey: SiteContentSectionKey;
  title: string;
  description?: string;
  fields: FieldDef[];
  initialValue: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = { ...initialValue };
    for (const field of fields) base[field.key] = initialValue[field.key] ?? "";
    return base;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);
    setError(null);

    try {
      const response = await fetch(`/api/lazsip/site-content/${sectionKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: values }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const details = data?.error?.details as Record<string, string[]> | undefined;
        const message = details && Object.values(details).flat().find(Boolean);
        throw new Error(message || data?.error?.message || "Gagal menyimpan. Coba lagi.");
      }
      setSuccess(true);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal menyimpan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={panelClasses("p-5 sm:p-6")}>
      <div className="border-b border-lazsip-primary-100 pb-4 dark:border-white/10">
        <h2 className="text-base font-bold tracking-tight text-lazsip-primary-900 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-lazsip-primary-800/60 dark:text-white/50">{description}</p>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-4">
        {fields.map((field) => (
          <div key={field.key} className={field.multiline ? "w-full" : "w-full sm:w-72"}>
            <FormField label={field.label+(field.required?" *":"")} htmlFor={`${sectionKey}-${field.key}`} hint={field.hint}>
              {field.options ? (
                <select id={`${sectionKey}-${field.key}`} value={values[field.key]} onChange={e => setValues(prev => ({...prev, [field.key]: e.target.value}))} className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground dark:bg-white/5 dark:text-white">
                  {field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.multiline ? (
                <textarea
                  id={`${sectionKey}-${field.key}`}
                  rows={field.rows ?? 3}
                  required={field.required}
                  className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft dark:bg-white/5 dark:text-white"
                  value={values[field.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              ) : (
                <Input
                  className="dark:bg-white/5 dark:text-white"
                  id={`${sectionKey}-${field.key}`}
                  type={field.type??"text"}
                  required={field.required}
                  value={values[field.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              )}
            </FormField>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-lazsip-primary-100 pt-5 dark:border-white/10">
        <LoadingButton type="submit" loading={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </LoadingButton>
        {success && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Tersimpan.
          </span>
        )}
        {error && <span role="alert" className="text-sm text-red-500">{error}</span>}
      </div>
    </form>
  );
}
