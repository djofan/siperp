import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control = "block h-11 min-w-0 w-full rounded-md bg-ojol-paper px-3.5 text-sm text-ojol-ink outline-none disabled:opacity-60";
export function Input({ className, ...props }: ComponentProps<"input">) { return <input className={cn(control,className)} {...props} />; }
export function Select({ className, ...props }: ComponentProps<"select">) { return <select className={cn(control,className)} {...props} />; }
export function FormField({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string; hint?: string; children: ReactNode }) {
  const required = Children.toArray(children).some(child => isValidElement<{ required?: boolean }>(child) && child.props.required);
  return <div className="flex min-w-0 flex-col gap-2">
    <label htmlFor={htmlFor} className="text-[13px] text-ojol-ink">{label}{required && <span className="ml-1 text-ojol-danger" aria-label="wajib diisi">*</span>}</label>
    {children}
    {hint && !error && <p className="text-xs leading-relaxed text-ojol-muted">{hint}</p>}
    {error && <p role="alert" className="text-xs text-ojol-danger">{error}</p>}
  </div>;
}
