import { RupiahNumberInput } from "./RupiahNumberInput";
import { Children, isValidElement } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldClasses =
  "h-11 min-w-0 w-full rounded-lg bg-surface-muted px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-50 sm:text-sm";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium text-foreground", className)} {...props} />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  if (props.type === "number" && /amount|price|cost|capital|estimate|income|salary|rent|budget|balance|nominal|rupiah/i.test(`${props.name ?? ""} ${props.id ?? ""}`)) return <RupiahNumberInput className={cn(fieldClasses, className)} {...props} />;
  return <input className={cn(fieldClasses, className)} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClasses, className)} {...props} />;
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}

export function FormField({ label, htmlFor, error, hint, children, required }: FormFieldProps) {
  const hasRequired = (nodes: ReactNode): boolean => Children.toArray(nodes).some(node => isValidElement<{required?: boolean; children?: ReactNode}>(node) && (node.props.required === true || hasRequired(node.props.children)));
  const mandatory = required === true || hasRequired(children);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}{mandatory && !label.includes("*") && <span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">*</span>}</Label>
      {children}
      {hint && !error && <p className="text-xs text-foreground/70">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
