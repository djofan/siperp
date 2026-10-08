"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/modules/tanwir/api/actions/state";
import { Icon } from "@/modules/tanwir/components/icons";
import { Notice, buttonClass, textareaClass } from "@/modules/tanwir/components/ui";

export function ReviewForm({ action }: { action: (state: ActionState, form: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <input type="hidden" name="decision" value={decision} />
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { value: "approved", label: "Setujui", icon: "check", active: "bg-tanwir-success text-white ring-tanwir-success" },
            { value: "rejected", label: "Tolak", icon: "x", active: "bg-tanwir-danger text-white ring-tanwir-danger" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={decision === option.value}
            onClick={() => setDecision(option.value)}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium ring-1 transition-colors",
              decision === option.value ? option.active : "ring-tanwir-line text-tanwir-muted hover:bg-tanwir-paper",
            )}
          >
            <Icon name={option.icon} className="h-4 w-4" />
            {option.label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-sm font-medium">{decision === "rejected" ? "Alasan penolakan (wajib)" : "Catatan untuk peserta (opsional)"}</span>
        <textarea
          name="feedback"
          rows={4}
          maxLength={5000}
          required={decision === "rejected"}
          placeholder={decision === "rejected" ? "Contoh: Bacaan ayat 5 belum lancar, panjang pendek mad perlu diperbaiki." : "Contoh: Bacaan sudah baik, pertahankan."}
          className={cn(textareaClass, "mt-1.5")}
        />
      </label>
      <button type="submit" disabled={pending} className={buttonClass(decision === "rejected" ? "danger" : "primary", "h-12 w-full")}>
        {pending ? "Menyimpan…" : decision === "rejected" ? "Tolak & minta kirim ulang" : "Setujui setoran"}
      </button>
    </form>
  );
}
