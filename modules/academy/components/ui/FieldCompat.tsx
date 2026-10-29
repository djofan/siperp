import type { LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "./utils";
export { Input } from "./input";
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) { return <label className={cn("text-sm font-medium text-slate-700", className)} {...props} />; }
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select className={cn("h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:opacity-50", className)} {...props} />; }
export function FormField({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={htmlFor}>{label}</Label>{children}{hint && !error && <p className="text-xs leading-5 text-slate-500">{hint}</p>}{error && <p className="text-xs text-red-600">{error}</p>}</div>;
}
