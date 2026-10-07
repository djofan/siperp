"use client";
import { useActionState } from "react";
import type { ErpActionState } from "./contact-actions";
export function ActionForm({ action, children, button }: { action: (state: ErpActionState, form: FormData) => Promise<ErpActionState>; children?: React.ReactNode; button: string }) {
  const [state, submit, pending] = useActionState(action, {});
  return <form action={submit} className="space-y-3">{children}<button disabled={pending} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-surface disabled:opacity-50">{pending ? "Memproses…" : button}</button>{state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}{state.message && <p role="status" className="text-sm text-emerald-700">{state.message}</p>}</form>;
}
