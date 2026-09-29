"use client";

import { useState } from "react";
import { SiteContentSectionForm, type FieldDef } from "@/modules/lazsip/components/admin/SiteContentSectionForm";
import type { SiteContentSectionKey } from "@/modules/lazsip/api/siteContent";
import { cn } from "@/lib/utils";

interface SectionConfig {
  sectionKey: SiteContentSectionKey;
  title: string;
  description: string;
  fields: FieldDef[];
  initialValue: Record<string, string>;
}

// Satu panel aktif dalam satu waktu (tab baris horizontal di atas), bukan 6 form ditumpuk
// lalu di-scroll panjang, dan bukan sidebar kedua di samping sidebar utama.
export function KontenUmumTabs({ sections }: { sections: SectionConfig[] }) {
  const [activeKey, setActiveKey] = useState<SiteContentSectionKey>(sections[0].sectionKey);
  const active = sections.find((section) => section.sectionKey === activeKey) ?? sections[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5 border-b border-lazsip-primary-100 pb-3 dark:border-white/10">
        {sections.map((section) => {
          const isActive = section.sectionKey === activeKey;
          return (
            <button
              key={section.sectionKey}
              type="button"
              onClick={() => setActiveKey(section.sectionKey)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-lazsip-primary-900 text-white dark:bg-lazsip-primary-600"
                  : "text-lazsip-primary-800/60 hover:bg-lazsip-primary-50 dark:text-white/55 dark:hover:bg-white/5"
              )}
            >
              {section.title}
            </button>
          );
        })}
      </div>

      <SiteContentSectionForm
        key={active.sectionKey}
        sectionKey={active.sectionKey}
        title={active.title}
        description={active.description}
        fields={active.fields}
        initialValue={active.initialValue}
      />
    </div>
  );
}
