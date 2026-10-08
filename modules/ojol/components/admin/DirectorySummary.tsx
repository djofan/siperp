import type { ReactNode } from "react";
import { Icon, type IconName } from "@/modules/ojol/components/icons";

export function DirectorySummary({ items }: { items: { label: string; value: ReactNode; detail: string; icon: IconName }[] }) {
  return <div className="directory-summary grid grid-cols-2 gap-4 lg:grid-cols-4">
    {items.map(item => <div key={item.label} className="directory-stat">
      <div className="flex items-center justify-between gap-3"><p>{item.label}</p><span className="directory-stat-icon"><Icon name={item.icon} className="h-4 w-4" /></span></div>
      <p className="directory-stat-value">{item.value}</p><p className="directory-stat-detail">{item.detail}</p>
    </div>)}
  </div>;
}
