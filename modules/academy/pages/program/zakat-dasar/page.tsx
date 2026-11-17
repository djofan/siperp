import Link from "@/modules/academy/pwa/AcademyNavigation";

export const metadata = { title: "Program Zakat Dasar — Insan Academy" };

export default function Page() {
  return <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
    <Link href="/academy/program" className="text-sm font-medium text-green-700 hover:underline">← Semua program</Link>
    <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6 sm:p-10">
      <p className="text-sm font-semibold text-green-700">Fikih Muamalah · Online · Gratis</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Zakat Dasar</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-gray-700">Bangun pemahaman dasar tentang zakat melalui pembelajaran yang bertahap dan terarah bersama Ustadz Irham Maulana, Lc., M.H.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href="/academy/daftar" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800">Informasi pendaftaran</Link><Link href="/academy/kontak" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-green-700 bg-white px-5 py-3 text-sm font-semibold text-green-700">Hubungi CS</Link></div>
    </div>
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <article className="rounded-2xl border border-gray-200 bg-white p-6"><h2 className="text-xl font-bold text-gray-900">Tentang program</h2><p className="mt-3 leading-relaxed text-gray-600">Zakat Dasar adalah program awal Insan Academy dalam pembelajaran fikih muamalah. Program ini ditujukan bagi muslim dan muslimah yang ingin mempelajari dasar zakat serta berkomitmen mengikuti pembelajaran hingga selesai.</p><p className="mt-3 leading-relaxed text-gray-600">Kelas Ikhwan dan Akhwat dipisahkan. Pendaftaran melalui formulir yang diinformasikan CS; akun peserta dibuatkan admin sesuai angkatan.</p></article>
      <article className="rounded-2xl border border-gray-200 bg-white p-6"><h2 className="text-xl font-bold text-gray-900">Cara belajar</h2><ul className="mt-3 list-disc space-y-3 pl-5 leading-relaxed text-gray-600"><li>Belajar daring dan mandiri melalui sekitar 12 materi audio, masing-masing maksimal 15 menit.</li><li>Bahan belajar PDF dibagikan sesuai materi yang dipelajari.</li><li>Mencatat materi, mengikuti ujian harian, pekanan, dan ujian akhir sesuai jadwal admin.</li><li>Rekap materi melalui Zoom pekanan serta pertanyaan melalui menu Tanya Ustadz.</li></ul></article>
    </div>
    <aside className="mt-6 rounded-2xl border border-gray-200 p-6"><h2 className="text-lg font-bold text-gray-900">Sudah menjadi peserta?</h2><p className="mt-2 leading-relaxed text-gray-600">Masuk ke akun untuk mengakses materi, catatan belajar, dan ujian sesuai angkatan. Jadwal pembelajaran serta pembukaan pendaftaran diinformasikan oleh admin.</p><div className="mt-4 flex flex-wrap gap-5 text-sm font-semibold text-green-700"><Link href="/academy/masuk" className="hover:underline">Masuk ke akun →</Link><Link href="/academy/faq" className="hover:underline">Baca FAQ →</Link></div></aside>
  </section>;
}
