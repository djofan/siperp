"use client";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
export type ActionState = { error?: string; success?: string; redirectTo?: string };
type Draft = Record<string, string>;
export function ActionForm({ action, children, submit = "Simpan", className = "", confirmMessage, draftKey }: { action: (state: ActionState, form: FormData) => Promise<ActionState>; children: React.ReactNode; submit?: string; className?: string; confirmMessage?: string; draftKey?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter(), titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null), form = useRef<HTMLFormElement>(null), approved = useRef(false);
  const snapshot = useRef<Draft>({}), uploads = useRef<Record<string, File[]>>({});
  const [message, setMessage] = useState("");
  function remember() {
    if (!form.current) return;
    const values: Draft = {};
    for (const control of Array.from(form.current.elements)) {
      if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) || !control.name) continue;
      if (control instanceof HTMLInputElement && control.type === "file") { if (control.files) uploads.current[control.name] = Array.from(control.files); continue; }
      if (control instanceof HTMLInputElement && ["hidden","password","checkbox","radio"].includes(control.type)) continue;
      values[control.name] = control.value;
    }
    snapshot.current = values;
    if (draftKey) try { sessionStorage.setItem(draftKey, JSON.stringify({saved:Date.now(), values})); } catch {}
  }
  useEffect(() => {
    if (!draftKey || !form.current) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (Date.now() - draft.saved > 86_400_000) { sessionStorage.removeItem(draftKey); return; }
      snapshot.current = draft.values;
      for (const [name, value] of Object.entries(draft.values as Draft)) {
        const control = form.current.elements.namedItem(name);
        if (control instanceof HTMLInputElement && !["file","hidden","password"].includes(control.type) || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) { control.value = value; control.dispatchEvent(new Event("change", {bubbles:true})); }
      }
    } catch {}
  }, [draftKey]);
  useEffect(() => {
    if (!state.error || !form.current) return;
    for (const [name,value] of Object.entries(snapshot.current)) {
      const control = form.current.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) control.value = value;
    }
    for (const [name, files] of Object.entries(uploads.current)) {
      const control = form.current.elements.namedItem(name);
      if (control instanceof HTMLInputElement && control.type === "file") { try { const transfer = new DataTransfer(); files.forEach(file => transfer.items.add(file)); control.files = transfer.files; } catch {} }
    }
  }, [state]);
  useEffect(() => {
    if (!state.success) return;
    if (draftKey) try { sessionStorage.removeItem(draftKey); } catch {}
    if (state.redirectTo) router.replace(state.redirectTo);
  }, [state, draftKey, router]);
  return <form ref={form} action={formAction} onChange={remember} onSubmit={event => {
    remember();
    if (!confirmMessage || approved.current) { approved.current = false; return; }
    event.preventDefault();
    const values = new FormData(event.currentTarget), price = values.get("amount") ?? values.get("finalPrice");
    setMessage(`${confirmMessage}${price !== null ? ` Nominal Rp${Number(price).toLocaleString("id-ID")}.` : ""}`);
    dialog.current?.showModal();
  }} className={`space-y-4 ${className}`}>
    <fieldset disabled={pending} className="tech-form-fields">{children}</fieldset>
    {draftKey && <p className="tech-draft-hint">Draft teks disimpan di tab ini selama 24 jam. Setelah refresh, pilih ulang file foto jika diperlukan.</p>}
    {state.error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{state.error}</p>}
    {state.success && <p role="status" className="text-sm text-emerald-500">{state.success}</p>}
    <Button disabled={pending} type="submit">{pending ? "Menyimpan…" : submit}</Button>
    {confirmMessage && <dialog ref={dialog} className="tech-confirm" aria-labelledby={titleId}><h2 id={titleId}>Konfirmasi tindakan</h2><p>{message}</p><div className="tech-toolbar"><button type="button" className="tech-btn secondary" onClick={() => dialog.current?.close()}>Periksa lagi</button><button type="button" className="tech-btn" onClick={() => { approved.current = true; dialog.current?.close(); form.current?.requestSubmit(); }}>Ya, lanjutkan</button></div></dialog>}
  </form>;
}
