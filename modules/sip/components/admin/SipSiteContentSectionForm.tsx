"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SipLoadingButton } from "@/modules/sip/components/admin/SipLoadingButton";
import { staticPanelClasses } from "@/components/ui/panel";
import type { SipSiteContentSectionKey } from "@/modules/sip/api/siteContent";

interface FieldDef {
  key: string;
  label: string;
  multiline?: boolean;
}

export function SipSiteContentSectionForm({
  sectionKey,
  title,
  fields,
  initialValue,
}: {
  sectionKey: SipSiteContentSectionKey;
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

    await fetch(`/api/sip/site-content/${sectionKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: values }),
    });

    setIsSubmitting(false);
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={staticPanelClasses("p-6 sm:p-8")}>
      <h2 className="text-sm font-semibold text-sip-primary-900">{title}</h2>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className={`flex flex-col gap-1.5 ${field.multiline ? "sm:col-span-2" : ""}`}>
            <label htmlFor={`${sectionKey}-${field.key}`} className="text-sm font-medium text-sip-primary-900">
              {field.label}
            </label>
            {field.multiline ? (
              <textarea
                id={`${sectionKey}-${field.key}`}
                rows={4}
                className="w-full rounded-2xl border border-sip-primary-200 bg-white p-3 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
                value={values[field.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            ) : (
              <input
                id={`${sectionKey}-${field.key}`}
                className="h-10 rounded-full border border-sip-primary-200 bg-white px-4 text-sm text-sip-primary-900 outline-none focus:ring-2 focus:ring-sip-primary-400"
                value={values[field.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3 border-t border-sip-primary-100 pt-6">
        <SipLoadingButton type="submit" loading={isSubmitting}>
          Simpan
        </SipLoadingButton>
        {success && <span className="text-sm text-sip-secondary-700">Tersimpan.</span>}
      </div>
    </form>
  );
}
