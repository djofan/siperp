import Link from "next/link";

export const metadata = { title: "Tentang Insan Academy" };
export default function Page() {

  return <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6"><p className="mb-3 text-sm font-semibold text-green-700">Insan Academy</p><h1 className="mb-8 text-3xl font-bold text-gray-900">Tentang Insan Academy</h1><div className="space-y-5 leading-relaxed text-gray-600"><p>Insan Academy adalah ruang belajar bersama LAZSIP dan Ustadz Irham. Peserta dapat mengikuti materi teks dan audio, mencatat pembelajaran, serta mengajukan pertanyaan kepada pengajar.</p><p>Program berlangsung selama satu bulan. Materi dibuka sesuai jadwal rilis, dilengkapi evaluasi dan pemantauan progres belajar.</p><Link href="/academy/program" className="font-semibold text-green-700">Lihat program belajar →</Link></div></section>;
}
