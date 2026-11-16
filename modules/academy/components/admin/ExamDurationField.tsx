"use client";

import { useId, useState } from "react";
import { FormField, Input } from "../ui/FieldCompat";

export function ExamDurationField({ initialMinutes }: { initialMinutes?: number | string }) {
  const initial = Number(initialMinutes);
  const hasInitial = initialMinutes !== "" && initialMinutes != null && Number.isFinite(initial) && initial > 0;
  const [hours, setHours] = useState(hasInitial ? String(Math.floor(initial / 60)) : "0");
  const [minutes, setMinutes] = useState(hasInitial ? String(initial % 60) : "");
  const id = useId();
  const total = Number(hours) * 60 + Number(minutes);
  const valid = hours !== "" && minutes !== "" && Number.isInteger(Number(hours)) && Number.isInteger(Number(minutes))
    && Number(hours) >= 0 && Number(hours) <= 24 && Number(minutes) >= 0 && Number(minutes) <= 59 && total >= 1 && total <= 1440;

  return <fieldset className="space-y-3" aria-describedby={id + "-hint"}>
    <legend className="text-sm font-medium">Durasi pengerjaan ujian *</legend>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Jam" htmlFor={id + "-hours"}>
        <Input id={id + "-hours"} type="number" min={0} max={24} step={1} required value={hours} onChange={event => setHours(event.target.value)} />
      </FormField>
      <FormField label="Menit" htmlFor={id + "-minutes"}>
        <Input id={id + "-minutes"} type="number" min={Number(hours) === 0 ? 1 : 0} max={Number(hours) === 24 ? 0 : 59} step={1} required placeholder="Contoh: 30" value={minutes} onChange={event => setMinutes(event.target.value)} />
      </FormField>
    </div>
    <input type="hidden" name="timeLimitMinutes" value={valid ? total : ""} />
    <p id={id + "-hint"} className="text-xs text-foreground/60">Contoh: 1 jam 30 menit untuk ujian selama 90 menit. Minimal 1 menit, maksimal 24 jam.</p>
    <p role="status" className="text-sm text-green-700">{valid ? `Total durasi: ${Number(hours)} jam ${Number(minutes)} menit (${total} menit)` : "Isi jam dan menit untuk menentukan durasi ujian."}</p>
  </fieldset>;
}
