"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
export type ActionState = { error?: string; success?: string };
export function ActionForm({ action, children, submit = "Simpan", className = "" }: { action: (state: ActionState, form: FormData) => Promise<ActionState>; children: React.ReactNode; submit?: string; className?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className={`space-y-4 ${className}`}>{children}{state.error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{state.error}</p>}{state.success && <p role="status" className="text-sm text-emerald-500">{state.success}</p>}<Button disabled={pending} type="submit">{pending ? "Menyimpan…" : submit}</Button></form>;
}
