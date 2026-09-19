"use client";

import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionState } from "../api/actions";

export function ActionForm({ action, label, children, className = "" }: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  label: string; children?: ReactNode; className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return <form action={formAction} className={`space-y-4 ${className}`}>
    {children}
    {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    <Button type="submit" disabled={pending} className="h-auto min-h-11 bg-lazsip-primary-800 px-5 py-3 hover:bg-lazsip-primary-900">{pending ? "Memproses…" : label}</Button>
  </form>;
}
