import Link from "next/link";
import { redirect } from "next/navigation";
import { getAcademyUser, getAcademyAvailability } from "../../api/access";
import { registerParticipant } from "../../api/actions";
import { ActionForm } from "../../components/ActionForm";
import { inputClass } from "../../components/ui";
import { PasswordField } from "../../components/ui/PasswordField";
import { getIntake, getLearningSettings } from "../../api/learning";

export default async function RegisterPage() {
  if (await getAcademyUser()) redirect(await getAcademyAvailability() ? "/academy/belajar" : "/academy");
  const [intake, settings] = await Promise.all([getIntake(), getLearningSettings()]);
  return <div className="mx-auto w-full max-w-sm"><div className="mb-8 text-center"><h1 className="text-2xl font-semibold tracking-tight">Daftar Insan Academy</h1><p className="mt-1 text-sm text-gray-500">Buat akun untuk mulai belajar zakat</p></div>
    <p className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{intake.course ? `${intake.course.title} · ${intake.filled}/${intake.course.quota} peserta · 1 bulan` : "Pendaftaran segera dibuka."}</p>
    {intake.full || !intake.course ? <p role="status" className="rounded-xl border p-5 text-sm">{intake.full ? "Pendaftaran angkatan ini sudah ditutup." : "Program sedang dipersiapkan."} Hubungi CS untuk informasi angkatan berikutnya.</p> : <ActionForm action={registerParticipant} label="Daftar & buat akun">
      <label className="block text-sm font-medium">Nama lengkap<input name="name" required minLength={2} maxLength={100} autoComplete="name" className={inputClass} /></label>
      <label className="block text-sm font-medium">Email<input name="email" type="email" required maxLength={191} autoComplete="email" className={inputClass} /></label>
      <label className="block text-sm font-medium">Nomor WhatsApp<input name="phone" type="tel" required maxLength={25} autoComplete="tel" placeholder="08xxxxxxxxxx" className={inputClass} /></label>
      <label className="block text-sm font-medium">Jenis kelamin<select name="gender" required className={inputClass} defaultValue=""><option value="" disabled>Pilih</option><option value="IKHWAN">Ikhwan</option><option value="AKHWAT">Akhwat</option></select></label>
      <div className="text-sm font-medium"><label htmlFor="academy-register-password">Password</label><PasswordField id="academy-register-password" name="password" required minLength={10} maxLength={72} autoComplete="new-password" className={inputClass} /><span className="mt-1 block text-xs text-lazsip-ink/70">Minimal 10 karakter.</span></div>
      <div className="text-sm font-medium"><label htmlFor="academy-confirm-password">Ulangi password</label><PasswordField id="academy-confirm-password" name="confirmPassword" required minLength={10} maxLength={72} autoComplete="new-password" className={inputClass} /></div>
    </ActionForm>}
    <p className="mt-5 text-sm text-gray-500">Admin akan menambahkan peserta ke grup belajar secara manual setelah verifikasi. Pembelajaran berlangsung satu bulan setelah tanggal mulai diumumkan.</p>
    <a href={`https://wa.me/${settings.csPhone}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-green-700">Hubungi CS · +62 811-1186-626 ↗</a>
    <p className="mt-6 text-sm">Sudah memiliki akun SIP? <Link href="/academy/masuk" className="font-semibold underline">Masuk</Link>.</p>
  </div>;
}
