"use client";

import type { FormEvent } from "react";
import { registerParticipant } from "../api/actions";
import { ActionForm } from "./ActionForm";
import { inputClass } from "./ui";
import { PasswordField } from "./ui/PasswordField";

export function RegistrationForm({ cohortTitle }: { cohortTitle: string }) {
  function preserveRegistrationFields(event: FormEvent<HTMLFormElement>) {
    // React resets the form even when a Server Action returns a validation error.
    // Preserve entered details, including the select, but clear both password fields.
    event.preventDefault();
    for (const input of event.currentTarget.querySelectorAll<HTMLInputElement>('input[name="password"], input[name="confirmPassword"]')) {
      input.value = "";
    }
  }

  return <ActionForm action={registerParticipant} label="Daftar & buat akun" onReset={preserveRegistrationFields}>
    <label className="block text-sm font-medium">Angkatan<input readOnly value={cohortTitle} className={inputClass} /></label>
    <label className="block text-sm font-medium">Nama lengkap<input name="name" required minLength={2} maxLength={100} autoComplete="name" className={inputClass} /></label>
    <label className="block text-sm font-medium">Email<input name="email" type="email" required maxLength={191} autoComplete="email" className={inputClass} /></label>
    <label className="block text-sm font-medium">Alamat<textarea name="address" required maxLength={2000} rows={3} autoComplete="street-address" className={inputClass} /></label>
    <label className="block text-sm font-medium">Nomor WhatsApp<input name="phone" type="tel" required maxLength={25} autoComplete="tel" placeholder="08xxxxxxxxxx" className={inputClass} /></label>
    <label className="block text-sm font-medium">Jenis kelamin<select name="gender" required className={inputClass} defaultValue=""><option value="" disabled>Pilih</option><option value="IKHWAN">Ikhwan</option><option value="AKHWAT">Akhwat</option></select></label>
    <div className="text-sm font-medium"><label htmlFor="academy-register-password">Password</label><PasswordField id="academy-register-password" name="password" required minLength={10} maxLength={72} autoComplete="new-password" className={inputClass} /><span className="mt-1 block text-xs text-lazsip-ink/70">Minimal 10 karakter.</span></div>
    <div className="text-sm font-medium"><label htmlFor="academy-confirm-password">Ulangi password</label><PasswordField id="academy-confirm-password" name="confirmPassword" required minLength={10} maxLength={72} autoComplete="new-password" className={inputClass} /></div>
  </ActionForm>;
}
