"use client";
import { useUnsavedWork } from "./useUnsavedWork";
import { useActionState, type ReactNode } from "react";
import type { ActionState } from "../api/actions";

export function MaterialForm({ action, children, initialPublished = false }: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode; initialPublished?: boolean;
}) {
  const work = useUnsavedWork();
  const [state, submit, pending] = useActionState(async (previous: ActionState, data: FormData) => { const version = work.snapshot(); const result = await action(previous, data); if (!result.error) work.markSaved(version); return result; }, { error: "" });
  return <form onReset={work.preventDraftReset} onChange={work.markChanged} action={submit} className="mt-4 space-y-4">
    {children}
    {work.offline && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">Anda sedang offline. Penyimpanan memerlukan internet; sambungkan kembali sebelum menyimpan.</p>}
    {(work.status || pending) && <p role="status" className="text-xs text-gray-600">{pending ? "Sedang mengirim ke server…" : work.status}</p>}
    <p className="text-sm text-gray-500">Draft hanya terlihat pengelola. Materi terpublikasi dapat dibuka peserta angkatan tujuan setelah pembelajaran dimulai.</p>
    {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="submit" name="isPublished" value="0" disabled={pending} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium disabled:opacity-50">{initialPublished ? "Jadikan draft" : "Simpan draft"}</button>
      <button type="submit" name="isPublished" value="1" disabled={pending} className="rounded-xl bg-green-700 px-5 py-3 text-sm font-medium text-white disabled:opacity-50">{pending ? "Menyimpan..." : initialPublished ? "Simpan & publikasikan" : "Publikasikan materi"}</button>
    </div>
  </form>;
}
