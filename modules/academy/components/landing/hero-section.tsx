"use client";

import { BookOpen, GraduationCap, Users } from "../icons";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden px-4 py-24 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-green-50/80 via-white to-white" />
        <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-green-100/60 blur-3xl" />
        <div className="absolute top-32 right-0 h-64 w-64 rounded-full bg-orange-100/40 blur-3xl" />
        <div className="absolute top-32 left-0 h-64 w-64 rounded-full bg-green-100/40 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <span className="inline-flex rounded-full border border-green-200 bg-green-50 text-green-700 hover:bg-green-50 px-4 py-1.5 text-sm font-medium">
            ✦ Belajar bersama Ustadz Irham
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Pahami Zakat dengan{" "}
          <span className="relative inline-block">
            <span className="relative z-10 text-green-600">Lebih Mudah</span>
            <span className="absolute bottom-1 left-0 z-0 h-3 w-full rounded bg-orange-200/60" />
          </span>
          {" "}dan Terstruktur
        </h1>

        <p className="mx-auto max-w-xl text-lg leading-relaxed text-gray-500">
          Belajar bersama Ustadz Irham melalui audio harian,
          catatan pribadi, dan evaluasi terstruktur selama satu bulan.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a href="/academy/masuk" className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-green-200 transition-all hover:bg-green-700 hover:-translate-y-0.5">
            Mulai Belajar
          </a>
          <a href="#programs" className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5">
            Lihat Program
          </a>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
              <BookOpen className="h-3.5 w-3.5 text-green-600" />
            </div>
            <span>Audio harian</span>
          </div>
          <div className="hidden h-4 w-px bg-gray-200 sm:block" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100">
              <GraduationCap className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <span>Kuis interaktif</span>
          </div>
          <div className="hidden h-4 w-px bg-gray-200 sm:block" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
              <Users className="h-3.5 w-3.5 text-green-600" />
            </div>
            <span>Sertifikat kelulusan</span>
          </div>
        </div>
      </div>
    </section>
  );
}
