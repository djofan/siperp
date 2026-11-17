import Link from "@/modules/academy/pwa/AcademyNavigation";
import { AcademyIcon } from "./icons";

export function HomeCourses() {
  return <div className="grid gap-5 md:grid-cols-2">
    <Link href="/academy/program/zakat-dasar" className="group flex h-full flex-col rounded-2xl border border-green-200 bg-white p-6 transition hover:border-green-600 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4"><span className="academy-icon-tile"><AcademyIcon name="BookOpen" className="h-6 w-6" /></span><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Program saat ini</span></div>
      <p className="text-sm font-medium text-green-700">Fikih Muamalah</p>
      <h3 className="mt-2 text-2xl font-bold text-gray-900">Zakat Dasar</h3>
      <p className="mt-3 leading-relaxed text-gray-600">Mulai memahami zakat secara bertahap bersama Ustadz Irham Maulana melalui materi audio, bahan belajar PDF, dan ujian terstruktur.</p>
      <ul className="my-6 flex flex-wrap gap-2 text-xs font-medium text-green-700"><li className="rounded-lg bg-green-50 px-3 py-2">Online</li><li className="rounded-lg bg-green-50 px-3 py-2">Gratis</li><li className="rounded-lg bg-green-50 px-3 py-2">Ikhwan &amp; Akhwat</li></ul>
      <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold text-green-700">Lihat penjelasan program <span aria-hidden="true">→</span></span>
    </Link>
    <article className="flex h-full flex-col rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4"><span className="academy-icon-tile"><AcademyIcon name="BookOpen" className="h-6 w-6" /></span><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">Coming Soon</span></div>
      <p className="text-sm font-medium text-gray-500">Terus bertumbuh dalam ilmu</p>
      <h3 className="mt-2 text-2xl font-bold text-gray-900">Program Lainnya</h3>
      <p className="mt-3 leading-relaxed text-gray-600">Program pembelajaran lainnya sedang dipersiapkan. Informasi materi, pengajar, dan pendaftaran akan diumumkan setelah program siap.</p>
      <p className="mt-auto pt-8 text-sm font-semibold text-gray-500">Segera hadir di Insan Academy</p>
    </article>
  </div>;
}
