"use client";

import { useActionState } from "react";
import type { ActionState } from "@/modules/ojol/api/actions/state";
import { EXTEND_HOURS_MAX, EXTEND_HOURS_MIN } from "@/modules/ojol/api/policy";
import { Notice, buttonClass, inputClass } from "@/modules/ojol/components/ui";

export function ExtendDeadlineForm({ action }: { action: (state: ActionState, form: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return (
    <form action={formAction} className="space-y-3">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Tambah (jam)
          <input name="hours" type="number" inputMode="numeric" required min={EXTEND_HOURS_MIN} max={EXTEND_HOURS_MAX} defaultValue={2} className={inputClass + " w-28"} />
        </label>
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Menyimpan…" : "Perpanjang"}
        </button>
      </div>
      <p className="text-xs text-ojol-muted">Dihitung dari sekarang. Setoran di masa perpanjangan tetap diterima namun ditandai terlambat.</p>
    </form>
  );
}
