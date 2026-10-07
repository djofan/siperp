"use client";

import { useCallback, useState } from "react";
import { usePersistedPreference } from "@/lib/usePersistedPreference";
import { SipSiteContentSectionForm, type FieldDef } from "@/modules/sip/components/admin/SipSiteContentSectionForm";
import type { SipSiteContentSectionKey } from "@/modules/sip/api/siteContent";
import { panelClasses } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export interface SipKontenSection {
  sectionKey: SipSiteContentSectionKey;
  title: string;
  description: string;
  previewHref?: string;
  fields: FieldDef[];
  initialValue: Record<string, string>;
}

// Daftar section satu baris di atas (bisa digeser kalau tidak muat) + satu form aktif di bawahnya.
// Semua form tetap ter-mount (yang tidak aktif cuma di-hide) supaya ketikan yang belum
// disimpan tidak hilang saat pindah section — section itu ditandai titik kuning.
export function SipKontenUmumEditor({ sections }: { sections: SipKontenSection[] }) {
  const [activeKey, setActiveKey] = usePersistedPreference<SipSiteContentSectionKey>(
    "sip-admin-konten-umum:section",
    sections.map((section) => section.sectionKey),
    sections[0].sectionKey
  );
  const [dirtyKeys, setDirtyKeys] = useState<Set<SipSiteContentSectionKey>>(new Set());

  const handleDirtyChange = useCallback((key: SipSiteContentSectionKey, dirty: boolean) => {
    setDirtyKeys((prev) => {
      if (prev.has(key) === dirty) return prev;
      const next = new Set(prev);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Section konten" className={panelClasses("p-1.5")}>
        <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {sections.map((section, index) => {
            const isActive = section.sectionKey === activeKey;
            const isDirty = dirtyKeys.has(section.sectionKey);
            return (
              <li key={section.sectionKey} className="shrink-0">
                <button
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setActiveKey(section.sectionKey)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-1.5 pr-3.5 text-sm transition-colors",
                    isActive ? "bg-sip-lime font-semibold text-sip-ink" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      isActive ? "bg-sip-ink/15" : "bg-white/[0.06] text-white/50"
                    )}
                  >
                    {index + 1}
                  </span>
                  <span>{section.title}</span>
                  {isDirty && (
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", isActive ? "bg-sip-ink" : "bg-amber-300")}
                      title="Ada perubahan belum disimpan"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0">
        {sections.map((section) => (
          <SipSiteContentSectionForm
            key={section.sectionKey}
            hidden={section.sectionKey !== activeKey}
            sectionKey={section.sectionKey}
            title={section.title}
            description={section.description}
            previewHref={section.previewHref}
            fields={section.fields}
            initialValue={section.initialValue}
            onDirtyChange={(dirty) => handleDirtyChange(section.sectionKey, dirty)}
          />
        ))}
      </div>
    </div>
  );
}
