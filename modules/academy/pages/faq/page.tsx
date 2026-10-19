
export const metadata = { title: "FAQ" };
export default function Page() {

  return <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6"><p className="mb-3 text-sm font-semibold text-green-700">Insan Academy</p><h1 className="mb-8 text-3xl font-bold text-gray-900">FAQ</h1><div className="space-y-5 leading-relaxed text-gray-600">{[
 ["Bagaimana cara bergabung?", "Daftar melalui halaman Cara Bergabung dan simpan NIP untuk login. Pendaftaran tersedia saat angkatan dibuka dan kuota masih tersedia."],
 ["Berapa lama program berlangsung?", "Pembelajaran berlangsung satu bulan setelah tanggal mulai program diumumkan."],
 ["Bagaimana mengakses materi?", "Masuk ke akun, lalu buka Materi Belajar. Materi teks dan audio tersedia sesuai hari rilis program."],
 ["Apakah saya bisa bertanya kepada pengajar?", "Ya. Peserta dapat menggunakan menu Tanya Jawab Ustadz di dashboard."],
 ["Bagaimana jika kesulitan masuk?", "Hubungi customer service melalui halaman Kontak untuk bantuan akun."],
 ].map(([question, answer]) => <details key={question} className="rounded-xl border border-gray-200 p-5"><summary className="cursor-pointer font-semibold text-gray-900">{question}</summary><p className="mt-3">{answer}</p></details>)}</div></section>;
}
