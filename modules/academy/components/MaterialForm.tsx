"use client";
import { useActionState, type ReactNode } from "react";
import type { ActionState } from "../api/actions";

export function MaterialForm({ action, children, initialPublished = false }: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode; initialPublished?: boolean;
}) {
  const [state, submit, pending] = useActionState(action, { error: "" });
  return <form action={submit} className="mt-4 space-y-4">
    {children}
    <p className="text-sm text-gray-500">Draft hanya terlihat pengelola. Materi terpublikasi dapat dibuka peserta angkatan tujuan setelah pembelajaran dimulai.</p>
    {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="submit" name="isPublished" value="0" disabled={pending} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium disabled:opacity-50">{initialPublished ? "Jadikan draft" : "Simpan draft"}</button>
      <button type="submit" name="isPublished" value="1" disabled={pending} className="rounded-xl bg-green-700 px-5 py-3 text-sm font-medium text-white disabled:opacity-50">{pending ? "Menyimpan..." : initialPublished ? "Simpan & publikasikan" : "Publikasikan materi"}</button>
    </div>
  </form>;
}
