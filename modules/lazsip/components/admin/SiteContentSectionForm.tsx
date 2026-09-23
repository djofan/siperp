"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, Input } from "@/components/ui/FormField";
import { LoadingButton } from "@/modules/lazsip/components/admin/LoadingButton";
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
    <form onSubmit={handleSubmit} className={panelClasses("p-6 sm:p-8")}>
      <h2 className="text-sm font-semibold text-lazsip-primary-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className={field.multiline ? "sm:col-span-2" : ""}>
            <FormField label={field.label} htmlFor={`${sectionKey}-${field.key}`}>
              {field.multiline ? (
                <textarea
                  id={`${sectionKey}-${field.key}`}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft dark:bg-white/5 dark:text-white"
                  value={values[field.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              ) : (
                <Input
                  className="dark:bg-white/5 dark:text-white"
                  id={`${sectionKey}-${field.key}`}
                  value={values[field.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              )}
            </FormField>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3 border-t border-lazsip-primary-100 pt-6 dark:border-white/10">
        <LoadingButton type="submit" loading={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </LoadingButton>
        {success && <span className="text-sm text-success">Tersimpan.</span>}
      </div>
    </form>
  );
}
