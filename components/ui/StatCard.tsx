import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { panelClasses } from "@/components/ui/panel";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <div className={panelClasses(cn("p-5", className))}>
      {icon && (
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
          {icon}
        </span>
      )}
      <p className="truncate text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-foreground/50">{label}</p>
    </div>
  );
}
