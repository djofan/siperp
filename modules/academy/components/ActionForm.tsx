"use client";

import { useActionState, type ReactNode, type FormEventHandler } from "react";
import { Button } from "@/modules/academy/components/ui/ButtonCompat";
import type { ActionState } from "../api/actions";

export function ActionForm({ action, label, children, className = "", onReset }: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  label: string; children?: ReactNode; className?: string;
  onReset?: FormEventHandler<HTMLFormElement>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return <form action={formAction} onReset={onReset} className={`space-y-4 ${className}`}>
    {children}
    {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    {state.message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{state.message}</p>}
    <Button type="submit" disabled={pending} className="h-auto min-h-11 bg-lazsip-primary-800 px-5 py-3 hover:bg-lazsip-primary-900">{pending ? "Memproses…" : label}</Button>
  </form>;
}
