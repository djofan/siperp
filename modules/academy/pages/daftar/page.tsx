import Link from "next/link";
import { redirect } from "next/navigation";
import { getAcademyUser, getAcademyAvailability } from "../../api/access";
import { RegistrationForm } from "../../components/RegistrationForm";
import { academyLoginDestination } from "../../api/auth-navigation";
import { getIntake, getLearningSettings } from "../../api/learning";

export default async function RegisterPage() {
  const user = await getAcademyUser();
  if (user) redirect(academyLoginDestination(user, await getAcademyAvailability()));
  const [intake, settings] = await Promise.all([getIntake(), getLearningSettings()]);
  return <div className="mx-auto w-full max-w-sm"><div className="mb-8 text-center"><h1 className="text-2xl font-semibold tracking-tight">Daftar Insan Academy</h1><p className="mt-1 text-sm text-gray-500">Buat akun untuk mulai belajar zakat</p></div>
    <p className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{intake.cohort ? `${intake.cohort.title} · ${intake.filled} peserta` : "Pendaftaran segera dibuka."}</p>
    {intake.full || !intake.cohort ? <p role="status" className="rounded-xl border p-5 text-sm">{intake.full ? "Pendaftaran angkatan ini sudah ditutup." : "Angkatan sedang dipersiapkan."} Hubungi CS untuk informasi angkatan berikutnya.</p> : <RegistrationForm cohortTitle={intake.cohort.title} />}
    <p className="mt-5 text-sm text-gray-500">Grup Ikhwan atau Akhwat ditentukan sesuai gender. Setelah pendaftaran, simpan NIP Anda untuk login. Pembelajaran berlangsung satu bulan setelah tanggal mulai diumumkan.</p>
    <a href={`https://wa.me/${settings.csPhone}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-green-700">Hubungi CS · +62 811-1186-626 ↗</a>
    <p className="mt-6 text-sm">Sudah memiliki akun SIP? <Link href="/academy/masuk" className="font-semibold underline">Masuk</Link>.</p>
  </div>;
}
