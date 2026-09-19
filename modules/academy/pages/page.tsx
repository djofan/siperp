import Link from "next/link";
import { Suspense } from "react";
import { HomeCourses } from "../components/HomeCourses";
import { EmptyState, linkButton } from "../components/ui";

export default function AcademyHomePage() {
  return <>
    <section className="relative overflow-hidden border-b border-lazsip-primary-100">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.4fr_1fr]">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-lazsip-primary-600">Ilmu yang tumbuh, manfaat yang mengalir</p>
          <h1 className="mt-6 max-w-2xl text-4xl leading-tight font-bold tracking-tight text-lazsip-primary-900 sm:text-6xl">Pahami zakat.<br /><span className="text-lazsip-primary-500">Amalkan ilmunya.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-lazsip-ink/75">Pelajari fiqh zakat dan ilmu Islam melalui video terstruktur. Mulai dari dasar, uji pemahaman, dan lanjutkan perjalanan belajar bersama LAZSIP.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/academy/program" className={linkButton}>Jelajahi program <span className="ml-3" aria-hidden="true">→</span></Link><a href="#cara-belajar" className="rounded-xl border border-lazsip-primary-200 px-5 py-3 text-sm font-semibold">Kenali cara belajar</a></div>
        </div>
        <div className="rounded-[2rem] bg-lazsip-primary-800 p-8 text-white sm:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-white/65">Langkah kecil, pemahaman mendalam</p>
          <p className="mt-6 text-3xl leading-snug font-semibold">Belajar dengan alur yang jelas.</p>
          <ol className="mt-8 space-y-6">{[["01", "Pilih program", "Temukan materi sesuai kebutuhanmu."], ["02", "Pelajari materinya", "Ikuti video dan catat hal penting."], ["03", "Uji pemahaman", "Kerjakan kuis dan pantau progresmu."]].map(([number, title, text]) => <li key={number} className="flex gap-4"><span className="text-sm text-white/50">{number}</span><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-white/70">{text}</p></div></li>)}</ol>
        </div>
      </div>
    </section>
    <section id="program" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-lazsip-primary-600">Program belajar</p><h2 className="mt-3 text-3xl font-bold text-lazsip-primary-900">Mulai dari rasa ingin tahu.</h2></div><Link href="/academy/program" className="text-sm font-semibold text-lazsip-primary-700">Lihat semua program →</Link></div>
      <Suspense fallback={<EmptyState>Memuat program belajar…</EmptyState>}><HomeCourses /></Suspense>
    </section>
    <section id="cara-belajar" className="bg-white/60"><div className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><h2 className="text-3xl font-bold text-lazsip-primary-900">Belajar lebih terarah.</h2><div className="mt-8 grid gap-8 sm:grid-cols-3">{[["Video terstruktur", "Ikuti materi per bab, dengan ringkasan dan bahan belajar yang bisa dibaca kembali."], ["Kuis interaktif", "Uji pemahaman setelah belajar dan pelajari hasilnya untuk memperkuat pengetahuan."], ["Progres dan sertifikat", "Pantau materi yang sudah selesai dan peroleh sertifikat setelah memenuhi syarat kelulusan."]].map(([title, description], index) => <div key={title}><p className="text-sm font-semibold text-lazsip-primary-500">0{index + 1}</p><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-lazsip-ink/70">{description}</p></div>)}</div></div></section>
  </>;
}
