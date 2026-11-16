import { academyServerHref, getAcademyBasePath } from "@/modules/academy/pwa/server-navigation";
import Link from "@/modules/academy/pwa/AcademyNavigation";
import { redirect } from "next/navigation";
import { getAcademyUser, getAcademyAvailability } from "../../api/access";
import { academyLoginDestination } from "../../api/auth-navigation";
import { getIntake, getLearningSettings } from "../../api/learning";

export default async function RegisterPage() {
  const user = await getAcademyUser();
  if (user) redirect(await academyServerHref(academyLoginDestination(user, await getAcademyAvailability(), (await getAcademyBasePath()) === "/academy-app")));
  const [intake, settings] = await Promise.all([getIntake(), getLearningSettings()]);
  const message = intake.cohort ? 'Assalamu alaikum, saya ingin mendaftar Insan Academy ' + intake.cohort.title + '. Mohon informasi formulir pendaftarannya.' : 'Assalamu alaikum, saya ingin informasi pendaftaran Insan Academy.';
  return <div className="mx-auto w-full max-w-sm"><div className="mb-6 text-center"><h1 className="text-2xl font-semibold tracking-tight">Pendaftaran Insan Academy</h1><p className="mt-2 text-sm text-gray-500">Hubungi CS untuk informasi dan formulir pendaftaran.</p></div>
    <p className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">{intake.cohort ? 'Pendaftaran ' + intake.cohort.title + ' dibuka.' : 'Pendaftaran angkatan berikutnya sedang dipersiapkan.'}</p>
    <div className="space-y-4 rounded-xl border bg-white p-5 text-sm leading-6"><p>Pendaftaran peserta dilakukan melalui formulir yang dibagikan oleh CS. Setelah data dikonfirmasi, admin akan membuatkan akun peserta sesuai angkatan dan grup Ikhwan atau Akhwat.</p><p>Kode akun dan password awal akan dibagikan kepada peserta untuk masuk ke ruang belajar.</p>
      {(settings.csContacts ?? [{ name: 'CS Academy', phone: settings.csPhone }]).map(contact => <a key={contact.phone} href={'https://wa.me/' + contact.phone + '?text=' + encodeURIComponent(message)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-green-700 px-4 py-3 font-semibold text-white">Hubungi {contact.name} melalui WhatsApp ↗</a>)}
    </div>
    <p className="mt-6 text-center text-sm">Sudah mendapat akun dari admin? <Link href="/academy/masuk" className="font-semibold underline">Masuk</Link>.</p>
  </div>;
}
