import Link from "next/link";

export const metadata = { title: "Cara Bergabung" };
export default function Page() {

  return <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6"><p className="mb-3 text-sm font-semibold text-green-700">Insan Academy</p><h1 className="mb-8 text-3xl font-bold text-gray-900">Cara Bergabung</h1><div className="space-y-5 leading-relaxed text-gray-600"><ol className="list-decimal space-y-4 pl-5"><li>Lihat program dan informasi angkatan yang tersedia.</li><li>Buka halaman Daftar, lalu isi data diri dan buat password. Pendaftaran mengikuti ketersediaan kuota.</li><li>Simpan NIP yang diberikan setelah pendaftaran untuk masuk ke akun.</li><li>Ikuti informasi grup Ikhwan atau Akhwat dan tanggal mulai program.</li><li>Masuk ke dashboard untuk membaca materi, mendengarkan audio, dan mengikuti ujian sesuai jadwal.</li></ol><Link href="/academy/daftar" className="inline-flex rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">Daftar Insan Academy</Link></div></section>;
}
