import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed border-border px-4 py-16 text-center text-sm text-foreground/70",
        className
      )}
    >
      {children}
    </div>
  );
}
