"use client";

const features = [
  {
    title: "Audio Ustadz Irham",
    description: "Satu pemateri, audio singkat setiap hari, dan pembelajaran bertahap selama satu bulan.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <rect x="2" y="4" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M17 9l5 3-5 3V9z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
    color: "bg-green-100 text-green-600",
    border: "border-green-100",
  },
  {
    title: "Kuis Interaktif",
    description: "Evaluasi harian, pekanan, dan akhir dengan pilihan ganda, benar–salah, serta beberapa jawaban benar.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 10l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "bg-orange-100 text-orange-500",
    border: "border-orange-100",
  },
  {
    title: "Catatan & Tanya Jawab",
    description: "Tulis catatan pribadi untuk murojaah, pantau progres, dan ajukan pertanyaan kepada pengajar.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "bg-green-100 text-green-600",
    border: "border-green-100",
  },
];

export function FeaturesSection() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-green-600">
            Fitur Unggulan
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Belajar Lebih Efektif
          </h2>
          <p className="mt-3 text-sm text-gray-500 md:text-base">
            Semua yang kamu butuhkan untuk memahami zakat dengan benar.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {features.map(({ title, description, icon, color, border }) => (
            <div
              key={title}
              className={`rounded-2xl border ${border} bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md`}
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                {icon}
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
