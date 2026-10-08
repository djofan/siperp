"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/modules/ojol/api/actions/state";
import { Avatar, Field, Notice, buttonClass, inputClass, textareaClass } from "@/modules/ojol/components/ui";
import { WilayahFields, type WilayahValue } from "./WilayahFields";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

/** Kecilkan foto di browser (sisi terpanjang 512 px, WebP) sebelum diunggah. */
async function resizeImage(file: File, max = 512): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    return blob ? new File([blob], "foto.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

export interface ProfileValues extends WilayahValue {
  name: string;
  email: string | null;
  phone: string | null;
  gender: "laki_laki" | "perempuan" | null;
  address: string | null;
  photoUrl: string | null;
}

export function ProfileForm({ action, initial }: { action: Action; initial: ProfileValues }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [preview, setPreview] = useState<string | null>(initial.photoUrl);

  return (
    <form action={formAction} className="crud-form space-y-6">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}

      <div className="flex items-center gap-4">
        <Avatar name={initial.name} src={preview} size={64} />
        <label className={buttonClass("secondary", "h-10 cursor-pointer px-4")}>
          Ganti foto
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              const resized = await resizeImage(file);
              // Ganti isi input dengan versi kecil supaya muat di batas server action (1 MB).
              const transfer = new DataTransfer();
              transfer.items.add(resized);
              input.files = transfer.files;
              setPreview(URL.createObjectURL(resized));
            }}
          />
        </label>
        <span className="text-xs text-ojol-muted">JPG, PNG, atau WEBP</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nama lengkap" htmlFor="profile-name">
          <input id="profile-name" name="name" required maxLength={191} defaultValue={initial.name} className={inputClass} />
        </Field>
        <Field label="Email (opsional)" htmlFor="profile-email">
          <input id="profile-email" name="email" type="email" maxLength={191} defaultValue={initial.email ?? ""} className={inputClass} />
        </Field>
        <Field label="Nomor HP / WhatsApp" htmlFor="profile-phone">
          <input id="profile-phone" name="phone" type="tel" inputMode="tel" maxLength={20} defaultValue={initial.phone ?? ""} className={inputClass} />
        </Field>
        <Field label="Jenis kelamin" htmlFor="profile-gender">
          <select id="profile-gender" name="gender" defaultValue={initial.gender ?? ""} className={inputClass}>
            <option value="">Pilih</option>
            <option value="laki_laki">Laki-laki</option>
            <option value="perempuan">Perempuan</option>
          </select>
        </Field>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-sm font-semibold">Alamat</legend>
        <WilayahFields initial={initial} selectClass={inputClass} labelClass="text-sm font-medium text-ojol-ink" />
        <Field label="Alamat detail" htmlFor="profile-address" hint="Nama jalan, perumahan, RT/RW.">
          <textarea id="profile-address" name="address" rows={2} maxLength={1000} defaultValue={initial.address ?? ""} className={textareaClass} />
        </Field>
      </fieldset>

      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Menyimpan…" : "Simpan profil"}
      </button>
    </form>
  );
}

export function PasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return (
    <form action={formAction} className="crud-form space-y-5">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}
      <Field label="Password lama" htmlFor="pw-current">
        <input id="pw-current" name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Password baru" htmlFor="pw-new" hint="Minimal 8 karakter.">
          <input id="pw-new" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={inputClass} />
        </Field>
        <Field label="Ulangi password baru" htmlFor="pw-confirm">
          <input id="pw-confirm" name="passwordConfirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={inputClass} />
        </Field>
      </div>
      <button type="submit" disabled={pending} className={buttonClass("secondary")}>
        {pending ? "Menyimpan…" : "Ganti password"}
      </button>
    </form>
  );
}
