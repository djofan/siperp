"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ComponentPropsWithRef, type FocusEvent } from "react";
import { formatIntegerInput, parseIntegerInput } from "@/lib/number-format";

type Props = ComponentPropsWithRef<"input">;

function rawEvent<E extends ChangeEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>>(event: E, raw: string): E {
  const proxy = new Proxy(event.currentTarget, { get(target, key) {
    if (key === "value") return raw;
    if (key === "valueAsNumber") return raw === "" ? NaN : Number(raw);
    const value = Reflect.get(target, key, target);
    return typeof value === "function" ? value.bind(target) : value;
  }});
  return new Proxy(event, { get(target, key) { if (key === "target" || key === "currentTarget") return proxy; const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value; } });
}

export function RupiahNumberInput({ name, value, defaultValue, onChange, onBlur, onKeyDown, ref: externalRef, type: _type, pattern: _pattern, maxLength: _maxLength, min, max, step: _step, ...props }: Props) {
  const initial = String(value ?? defaultValue ?? "");
  const [draft, setDraft] = useState(() => ({ source: value, text: formatIntegerInput(initial) }));
  const text = value !== undefined && !Object.is(draft.source, value) ? formatIntegerInput(String(value ?? "")) : draft.text;
  const setText = useCallback((text: string) => setDraft({ source: value, text }), [value]);
  const strictChange = useRef(false);
  const input = useRef<HTMLInputElement | null>(null), hidden = useRef<HTMLInputElement | null>(null);
  const ownError = useRef("");
  const caret = useRef<number | null>(null);
  const raw = parseIntegerInput(text);
  useEffect(() => { const form = input.current?.form; const reset = () => { if (value === undefined) setText(formatIntegerInput(String(defaultValue ?? ""))); }; form?.addEventListener("reset", reset); return () => form?.removeEventListener("reset", reset); }, [defaultValue, value, setText]);
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    let error = raw === null ? "Masukkan nominal rupiah bulat, misalnya 1.500.000." : "";
    if (raw) {
      const number = Number(raw);
      if (!Number.isSafeInteger(number)) error = "Nominal terlalu besar atau tidak valid.";
      else if (min !== undefined && number < Number(min)) error = `Nominal minimal ${formatIntegerInput(String(min))}.`;
      else if (max !== undefined && number > Number(max)) error = `Nominal maksimal ${formatIntegerInput(String(max))}.`;
    }
    if (!element.validity.customError || element.validationMessage === ownError.current) { element.setCustomValidity(error); ownError.current = error; }
    if (caret.current !== null && document.activeElement === element) {
      let position = text.startsWith("-") ? 1 : 0, seen = 0;
      while (position < text.length && seen < caret.current) { if (/\d/.test(text[position])) seen++; position++; }
      element.setSelectionRange(position, position); caret.current = null;
    }
  }, [text, raw, min, max]);
  return <><input {...props} ref={element => { input.current = element; if (typeof externalRef === "function") externalRef(element); else if (externalRef) externalRef.current = element; }}
    type="text" inputMode="numeric" value={text} aria-invalid={raw === null || props["aria-invalid"] || undefined}
    onChange={event => {
      const next = parseIntegerInput(event.currentTarget.value, strictChange.current);
      strictChange.current = false;
      caret.current = event.currentTarget.value.slice(0, event.currentTarget.selectionStart ?? 0).replace(/\D/g, "").length;
      setText(next === null ? event.currentTarget.value : formatIntegerInput(next));
      if (hidden.current) hidden.current.value = next ?? "";
      if (next !== null) onChange?.(rawEvent(event, next));
    }}
    onPaste={event => { props.onPaste?.(event); if (!event.defaultPrevented) strictChange.current = true; }}
    onBlur={event => onBlur?.(rawEvent(event, raw ?? ""))}
    onKeyDown={event => {
      onKeyDown?.(event); if (event.defaultPrevented) return;
      if (event.key === "." || event.key === ",") { event.preventDefault(); return; }
      const el = event.currentTarget, start = el.selectionStart ?? 0;
      if (start === el.selectionEnd && event.key === "Backspace" && text[start - 1] === ".") el.setSelectionRange(start - 1, start - 1);
      if (start === el.selectionEnd && event.key === "Delete" && text[start] === ".") el.setSelectionRange(start + 1, start + 1);
    }} />
    {name && <input ref={hidden} type="hidden" name={name} form={props.form} value={raw ?? ""} disabled={props.disabled} />}
  </>;
}
