"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, Input } from "@/components/ui/FormField";
import { panelClasses } from "@/components/ui/panel";
import type { SiteContentSectionKey } from "@/modules/lazsip/api/siteContent";

interface FieldDef {
  key: string;
  label: string;
  multiline?: boolean;
}

export function SiteContentSectionForm({
  sectionKey,
  title,
  fields,
  initialValue,
}: {
  sectionKey: SiteContentSectionKey;
  title: string;
  fields: FieldDef[];
  initialValue: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const field of fields) base[field.key] = initialValue[field.key] ?? "";
    return base;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccess(false);

    await fetch(`/api/lazsip/site-content/${sectionKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: values }),
    });

    setIsSubmitting(false);
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={panelClasses("flex max-w-xl flex-col gap-4 p-5")}>
      <h2 className="text-sm font-semibold text-lazsip-primary-900 dark:text-white">
        {title}
      </h2>
      {fields.map((field) => (
        <FormField key={field.key} label={field.label} htmlFor={`${sectionKey}-${field.key}`}>
          {field.multiline ? (
            <textarea
              id={`${sectionKey}-${field.key}`}
              rows={4}
              className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              value={values[field.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            />
          ) : (
            <Input
              id={`${sectionKey}-${field.key}`}
              value={values[field.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            />
          )}
        </FormField>
      ))}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-lazsip-primary-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-lazsip-primary-700 dark:hover:bg-lazsip-primary-600"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </button>
        {success && <span className="text-sm text-success">Tersimpan.</span>}
      </div>
    </form>
  );
}
