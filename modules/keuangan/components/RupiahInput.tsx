"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatRupiahInput, parseRupiahInput } from "../rupiah-input";

export function RupiahInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [display, setDisplay] = useState(() => formatRupiahInput(defaultValue));
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const raw = parseRupiahInput(display);
  const invalid = raw === null || raw.length > 16 || raw === "0";
  const error = invalid ? "Masukkan nominal rupiah utuh lebih dari nol, maksimal 16 digit. Contoh: 4.000.000." : "";
  useEffect(() => { input.current?.setCustomValidity(error); }, [error]);

  function apply(text: string, caret?: number, strict = false) {
    // While editing, existing separators can move. Pasted separators must be valid groups.
    const candidate = strict ? parseRupiahInput(text) : /^[\d.]*$/.test(text) ? text.replace(/\./g, "").replace(/^0+(?=\d)/, "") : null;
    if (candidate === null) { setDisplay(text); return; }
    const formatted = formatRupiahInput(candidate);
    setDisplay(formatted);
    if (caret !== undefined) {
      const digitsBefore = text.slice(0, caret).replace(/\D/g, "").length;
      let position = 0, seen = 0;
      while (position < formatted.length && seen < digitsBefore) {
        if (/\d/.test(formatted[position])) seen++;
        position++;
      }
      requestAnimationFrame(() => input.current?.setSelectionRange(position, position));
    }
  }

  return <label>Nominal pengajuan (rupiah)
    <input ref={input} name="amountDisplay" type="text" inputMode="numeric" required pattern="[1-9][0-9]{0,2}(\.[0-9]{3})*" maxLength={21}
      value={display} placeholder="Contoh: 4.000.000" aria-describedby={hintId} aria-invalid={invalid || undefined}
      onChange={event => apply(event.currentTarget.value, event.currentTarget.selectionStart ?? undefined)}
      onKeyDown={event => { if (event.key === ".") event.preventDefault(); }}
      onPaste={event => {
        event.preventDefault();
        const pasted = event.clipboardData.getData("text");
        const target = event.currentTarget;
        const next = display.slice(0, target.selectionStart ?? 0) + pasted + display.slice(target.selectionEnd ?? display.length);
        apply(next, undefined, true);
      }} />
    <input type="hidden" name="amount" value={raw ?? ""} />
    <small id={hintId} role={invalid ? "alert" : undefined}>{error || "Pemisah ribuan ditambahkan otomatis. Nominal disimpan sebagai rupiah utuh."}</small>
  </label>;
}
