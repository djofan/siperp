import { FormField, Input, Select } from "@/components/ui/FormField";
export function Field({ name, label, type = "text", required = true, value, min, maxLength = 191 }: { name: string; label: string; type?: string; required?: boolean; value?: string | number; min?: number; maxLength?: number }) {
  return <FormField label={label} htmlFor={name}>{type === "text" && maxLength > 500 ? <textarea id={name} name={name} required={required} defaultValue={value} maxLength={maxLength} rows={3} className="w-full rounded-lg bg-surface-muted px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent-soft" /> : <Input id={name} name={name} type={type} required={required} defaultValue={value} min={min} maxLength={maxLength} />}</FormField>;
}
export function Choice({ name, label, children, value, required = false }: { name: string; label: string; children: React.ReactNode; value?: string; required?: boolean }) {
  return <FormField label={label} htmlFor={name}><Select id={name} name={name} defaultValue={value} required={required}>{children}</Select></FormField>;
}
