import Link from "next/link";
import { AcademyInstallPanel } from "../../pwa/AcademyPwa";
import { PageHeading } from "../../components/ui";
export default function InstallPage() {
  return <div className="mx-auto max-w-2xl p-4 md:p-6">
    <PageHeading title="Pasang aplikasi Academy">Buka pembelajaran dari layar utama HP tanpa memasang aplikasi dari toko aplikasi.</PageHeading>
    <AcademyInstallPanel/>
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-semibold">Belajar dengan akun yang sama</h2><p className="mt-3 text-sm leading-6 text-gray-600">Materi, ujian, progres, sertifikat, dan tanya jawab tetap mengikuti akun serta hak akses ERP. Internet diperlukan untuk membuka data terbaru dan menyimpan pekerjaan. Pemasangan ini belum mencakup notifikasi popup di background.</p><Link href="/academy/lanjut" className="mt-4 inline-block text-sm font-medium text-green-700 underline">Buka ruang belajar</Link></section>
  </div>;
}
