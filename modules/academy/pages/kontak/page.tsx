import { getLearningSettings } from "../../api/learning";
export const metadata = { title: "Kontak" };
export default async function Page() {
  const settings = await getLearningSettings();
  return <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6"><p className="mb-3 text-sm font-semibold text-green-700">Insan Academy</p><h1 className="mb-8 text-3xl font-bold text-gray-900">Kontak</h1><div className="space-y-5 leading-relaxed text-gray-600"><p>Hubungi customer service Insan Academy untuk informasi pendaftaran, angkatan berikutnya, atau bantuan mengakses akun dan materi belajar.</p><a href={`https://wa.me/${settings.csPhone}`} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">Hubungi CS melalui WhatsApp</a><p className="text-sm">WhatsApp: +{settings.csPhone}</p></div></section>;
}
