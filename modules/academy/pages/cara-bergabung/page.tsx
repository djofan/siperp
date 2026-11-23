import { formatNumericText } from "@/lib/number-format";
import Link from "@/modules/academy/pwa/AcademyNavigation";

export const metadata = { title: "Cara Bergabung" };

const steps = [
  {title:"Kenali program dan angkatan",description:"Pelajari informasi program Zakat Dasar serta pengumuman pembukaan pendaftaran angkatan dari pengelola."},
  {title:"Hubungi CS untuk formulir pendaftaran",description:"Buka halaman informasi pendaftaran atau hubungi CS melalui WhatsApp. CS akan memberikan arahan dan formulir pendaftaran ketika pendaftaran dibuka."},
  {title:"Lengkapi formulir dengan jujur",description:"Isi data sesuai arahan CS. Peserta tidak membuat akun sendiri melalui website; admin akan memproses data dan menempatkan peserta pada angkatan serta kelompok Ikhwan atau Akhwat yang sesuai."},
  {title:"Terima akun dari admin",description:"Setelah pendaftaran diproses, admin membuatkan akun dan menyampaikan nomor akun serta password awal. Simpan informasi tersebut dan ganti password awal saat pertama kali masuk."},
  {title:"Ikuti informasi kelompok belajar",description:"Ikuti arahan untuk bergabung ke grup WhatsApp Ikhwan atau Akhwat. Perhatikan jadwal pembukaan, materi, ujian, dan sesi Zoom yang diumumkan admin."},
  {title:"Masuk dan mulai belajar",description:"Gunakan akun yang diberikan admin untuk masuk ke ruang belajar melalui browser atau aplikasi. Buka Materi Belajar, simak audio dan PDF, buat catatan, serta kerjakan ujian sesuai jadwal."},
];

export default function Page() {
  return <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <p className="mb-3 text-sm font-semibold text-green-700">Insan Academy</p>
    <h1 className="text-3xl font-bold text-gray-900">Cara Bergabung</h1>
    <p className="mb-8 mt-3 leading-relaxed text-gray-600">Pendaftaran dibantu oleh CS. Akun belajar dibuatkan admin setelah data peserta diproses.</p>
    <ol className="space-y-4">{steps.map((step,index)=><li key={step.title} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-sm font-bold text-green-700">{formatNumericText(index+1)}</span><div className="min-w-0"><h2 className="font-semibold text-gray-900">{step.title}</h2><p className="mt-2 text-sm leading-relaxed text-gray-600">{step.description}</p></div></li>)}</ol>
    <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/academy/daftar" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800">Informasi pendaftaran</Link><Link href="/academy/kontak" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-green-700 px-5 py-3 font-semibold text-green-700">Hubungi CS</Link></div>
    <p className="mt-5 text-sm text-gray-600">Sudah mendapat akun dari admin? <Link href="/academy/masuk" className="font-semibold text-green-700 underline">Masuk ke ruang belajar</Link>.</p>
  </section>;
}
