"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import { staticPanelClasses } from "@/components/ui/panel";
import { lazsipColors } from "@/modules/lazsip/components/theme";
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
    <form onSubmit={handleSubmit} className={staticPanelClasses("flex max-w-xl flex-col gap-4 p-5")}>
      <h2 className="text-sm font-semibold" style={{ color: lazsipColors.ink }}>
        {title}
      </h2>
      {fields.map((field) => (
        <FormField key={field.key} label={field.label} htmlFor={`${sectionKey}-${field.key}`}>
          {field.multiline ? (
            <textarea
              id={`${sectionKey}-${field.key}`}
              rows={4}
              className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground outline-none focus:border-[#F79633] focus:ring-2 focus:ring-[#F79633]/20"
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
        <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: lazsipColors.primary }}>
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </Button>
        {success && <span className="text-sm text-success">Tersimpan.</span>}
      </div>
    </form>
  );
}
