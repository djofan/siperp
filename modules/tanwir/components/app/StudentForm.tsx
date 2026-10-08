"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "@/modules/tanwir/api/actions/state";
import { Field, Notice, buttonClass, inputClass, textareaClass } from "@/modules/tanwir/components/ui";

export interface StudentValues {
  memberId?: string;
  name: string;
  age: number | null;
  className: string | null;
  parentName: string | null;
  parentPhone: string | null;
  progress: string | null;
}

export function StudentForm({
  action,
  initial,
  owners,
  cancelHref,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  initial?: StudentValues | null;
  owners?: { id: string; code: string; user: { name: string } }[];
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return (
    <form action={formAction} className="crud-form space-y-5">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {owners && (
        <Field label="Peserta (guru ngaji)" htmlFor="student-owner" hint="Santri ini tercatat sebagai anak didik peserta tersebut.">
          <select id="student-owner" name="memberId" required defaultValue={initial?.memberId ?? ""} className={inputClass}>
            <option value="" disabled>
              Pilih peserta
            </option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.user.name} · {owner.code}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
        <Field label="Nama anak" htmlFor="student-name">
          <input id="student-name" name="name" required maxLength={191} defaultValue={initial?.name} className={inputClass} />
        </Field>
        <Field label="Usia" htmlFor="student-age">
          <input id="student-age" name="age" type="number" inputMode="numeric" min={1} max={99} defaultValue={initial?.age ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Kelas / jilid" htmlFor="student-class">
        <input id="student-class" name="className" maxLength={191} placeholder="Contoh: Iqra 3, Al-Qur'an juz 1" defaultValue={initial?.className ?? ""} className={inputClass} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nama orang tua / wali" htmlFor="student-parent">
          <input id="student-parent" name="parentName" maxLength={191} defaultValue={initial?.parentName ?? ""} className={inputClass} />
        </Field>
        <Field label="Nomor HP orang tua / wali" htmlFor="student-parent-phone">
          <input id="student-parent-phone" name="parentPhone" type="tel" inputMode="tel" maxLength={20} defaultValue={initial?.parentPhone ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Progres belajar / hafalan" htmlFor="student-progress" hint="Catat perkembangan terakhir, mis. surah yang sudah dihafal atau jilid yang sedang dipelajari.">
        <textarea id="student-progress" name="progress" rows={4} maxLength={5000} defaultValue={initial?.progress ?? ""} className={textareaClass} />
      </Field>
      <div className="form-actions">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Batal
        </Link>
      </div>
    </form>
  );
}
