"use client";

import { useId } from "react";
import { FormField, Input } from "../ui/FieldCompat";

export function ExamDurationField({ initialMinutes }: { initialMinutes?: number | string }) {
  const id = useId();
  return <FormField label="Durasi pengerjaan (menit) *" htmlFor={id} hint="Minimal 1 menit, maksimal 1440 menit.">
    <Input id={id} name="timeLimitMinutes" type="number" min={1} max={1440} step={1} required defaultValue={initialMinutes ?? ""} placeholder="Contoh: 30" />
  </FormField>;
}
