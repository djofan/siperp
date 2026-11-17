export const metadata = { title: "FAQ Insan Academy" };

const faqs = [
  {
    question: "Apakah pembelajaran Insan Academy dilakukan secara tatap muka?",
    answer: "Tidak. Insan Academy diselenggarakan secara online atau daring. Peserta belajar secara mandiri menggunakan materi audio. Tersedia pula sesi Zoom pekanan untuk membahas rekap materi dan perkembangan pembelajaran selama satu pekan.",
  },
  {
    question: "Apa saja syarat menjadi peserta Insan Academy?",
    answer: "Peserta adalah muslim atau muslimah yang berkomitmen untuk belajar, bukan sekadar mencoba. Peserta perlu mengisi formulir pendaftaran dengan jujur dan lengkap serta memiliki sarana belajar, seperti smartphone atau PC/laptop untuk mengakses materi. Pendaftaran dilakukan melalui formulir yang diinformasikan CS; akun peserta dibuatkan oleh admin sesuai angkatan.",
  },
  {
    question: "Apakah materi audio diberikan melalui grup WhatsApp?",
    answer: "Ya, materi dibagikan melalui grup WhatsApp. Materi dan tugas juga dapat diakses melalui aplikasi pada Android atau melalui browser pada smartphone maupun PC/laptop.",
  },
  {
    question: "Apa saja tugas peserta Insan Academy Online?",
    answer: "Peserta menyimak dan mencatat materi audio, kemudian mengerjakan ujian harian, ujian pekanan, serta ujian akhir. Ujian menggunakan sistem open book atau resume sesuai arahan pengajar.",
  },
  {
    question: "Materi atau kelas apa saja yang tersedia di Insan Academy?",
    answer: "Saat ini Insan Academy menyediakan pembelajaran fikih muamalah, khususnya Zakat Dasar. Kelas lainnya direncanakan hadir pada pengembangan berikutnya.",
  },
  {
    question: "Apakah ada kelas praktik di Insan Academy?",
    answer: "Ke depannya, Insan Academy merencanakan kelas praktik menghitung zakat perusahaan atau zakat niaga pada Zakat Level 2, praktik menjadi wakil penjualan pada kelas Wakalah, serta praktik kerja sama mendirikan usaha pada kelas Musyarakah.",
  },
  {
    question: "Berapa lama pembelajaran setiap kelas online?",
    answer: "Setiap kelas terdiri dari sekitar 12 materi audio, masing-masing berdurasi maksimal 15 menit, yang dipelajari selama dua hingga tiga pekan. Dalam satu pekan diberikan empat materi. Jadwal lengkap diinformasikan oleh admin.",
  },
  {
    question: "Bagaimana jika peserta bekerja dan memiliki waktu belajar yang terbatas?",
    answer: "Peserta dapat memilih waktu belajar sesuai aktivitasnya. Rencana masa belajar setiap materi adalah 48 jam atau dua hari. Ikuti jadwal yang diumumkan admin; materi yang telah dipublikasikan tetap dapat dibuka melalui menu Materi Belajar setelah masa tampilnya di beranda berakhir, selama publikasinya tidak dinonaktifkan oleh admin.",
  },
  {
    question: "Bagaimana jika jadwal ujian bertepatan dengan waktu bekerja?",
    answer: "Rentang akses adalah waktu yang tersedia bagi peserta untuk mulai mengerjakan ujian: 24 jam untuk ujian harian serta 48 jam untuk ujian pekanan dan ujian akhir, sesuai tanggal dan jam yang diatur admin. Peserta dapat memilih waktu mulai dalam rentang tersebut. Setelah ujian dimulai, durasi pengerjaan mengikuti batas menit ujian dan tetap berjalan meskipun halaman ditutup. Pengerjaan juga harus selesai sebelum rentang akses berakhir. Siapkan waktu yang cukup sebelum memulai; timer ujian tidak dapat dijeda.",
  },
  {
    question: "Apakah ada sesi tanya jawab dengan Ustadz Irham Maulana hafizhahullah?",
    answer: "Ada. Peserta dapat mengirim pertanyaan melalui menu Tanya Ustadz di web Insan Academy. Peserta juga dapat bertanya pada sesi Zoom pekanan setelah kajian rekap materi selesai, apabila waktu Ustadz Irham Maulana memungkinkan.",
  },
  {
    question: "Dari mana sumber materi Insan Academy?",
    answer: "Materi bersumber dari Kitab Fikih Muamalat, Kitab Minhajus Shalikin, serta standar syariah yang dikeluarkan oleh Accounting and Auditing Organization for Islamic Financial Institutions (AAOIFI).",
  },
  {
    question: "Apakah Insan Academy berbayar?",
    answer: "Insan Academy Online adalah kelas gratis dan terbuka untuk umum sesuai persyaratan peserta. Peserta yang ingin memberikan infak dipersilakan melakukannya secara sukarela.",
  },
  {
    question: "Apakah Insan Academy menyediakan sertifikat?",
    answer: "Ya. Sertifikat digital dapat diunduh setelah periode kelas dan seluruh jadwal ujian berakhir melalui menu Sertifikat pada akun peserta.",
  },
];

export default function Page() {
  return <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <p className="mb-3 text-sm font-semibold text-green-700">Insan Academy</p>
    <h1 className="text-3xl font-bold text-gray-900">FAQ Insan Academy</h1>
    <p className="mb-8 mt-3 leading-relaxed text-gray-600">Berikut informasi terkait Insan Academy yang sering ditanyakan.</p>
    <div className="space-y-4 leading-relaxed text-gray-600">
      {faqs.map(({ question, answer }) => <details key={question} className="rounded-xl border border-gray-200 bg-white p-5">
        <summary className="cursor-pointer font-semibold text-gray-900 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700">{question}</summary>
        <p className="mt-3">{answer}</p>
      </details>)}
    </div>
  </section>;
}
