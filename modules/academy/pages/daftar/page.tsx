import Link from "next/link";
import { redirect } from "next/navigation";
import { getAcademyUser, requireAcademyAvailable } from "../../api/access";
import { registerParticipant } from "../../api/actions";
import { ActionForm } from "../../components/ActionForm";
import { PageHeading, inputClass } from "../../components/ui";
import { PasswordField } from "../../components/ui/PasswordField";

export default async function RegisterPage() {
  await requireAcademyAvailable();
  if (await getAcademyUser()) redirect("/academy/belajar");
  return <div className="mx-auto max-w-lg px-4 py-16"><PageHeading title="Mulai perjalanan belajarmu.">Buat akun untuk mengikuti program Zakat Academy.</PageHeading>
    <ActionForm action={registerParticipant} label="Buat akun">
      <label className="block text-sm font-medium">Nama lengkap<input name="name" required minLength={2} maxLength={100} autoComplete="name" className={inputClass} /></label>
      <label className="block text-sm font-medium">Email<input name="email" type="email" required maxLength={191} autoComplete="email" className={inputClass} /></label>
      <div className="text-sm font-medium"><label htmlFor="academy-register-password">Password</label><PasswordField id="academy-register-password" name="password" required minLength={10} maxLength={72} autoComplete="new-password" className={inputClass} /><span className="mt-1 block text-xs text-lazsip-ink/70">Minimal 10 karakter.</span></div>
      <div className="text-sm font-medium"><label htmlFor="academy-confirm-password">Ulangi password</label><PasswordField id="academy-confirm-password" name="confirmPassword" required minLength={10} maxLength={72} autoComplete="new-password" className={inputClass} /></div>
    </ActionForm>
    <p className="mt-6 text-sm">Sudah memiliki akun SIP? <Link href="/academy/masuk" className="font-semibold underline">Masuk</Link>.</p>
  </div>;
}
