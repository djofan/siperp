import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ClipboardList, GraduationCap, Layers, Users } from "lucide-react";
import { requireAcademyAdmin } from "../../api/admin-access";
import { curriculumStats } from "../../api/admin-curriculum";
import { AdminHeading } from "../admin/AdminUi";
import { MetricCard } from "../DashboardCards";
import { Button } from "../ui/button";
import { Card, CardHeader, CardContent } from "../ui/card";

export default async function AdminOverview() {
  const user = await requireAcademyAdmin();
  const stats = await curriculumStats();
  const shortcuts = [
    { href: "materi", title: "Materi", detail: "Unggah audio dan PDF, atur urutan, serta ubah status publikasi materi.", icon: BookOpen },
    { href: "kuis", title: "Ujian", detail: "Kelola ujian harian, pekanan, dan akhir beserta soal, jawaban, serta tenggatnya.", icon: ClipboardList },
    { href: "peserta", title: "Peserta", detail: "Kelola profil, nomor peserta, kelompok, dan keikutsertaan angkatan.", icon: Users },
    { href: "pendaftaran", title: "Pendaftaran", detail: "Daftarkan peserta satu per satu atau impor melalui Excel.", icon: CalendarDays },
    { href: "angkatan", title: "Angkatan", detail: "Siapkan angkatan dan atur pembukaan atau penutupan pendaftaran.", icon: Layers },
    { href: "sertifikat", title: "Sertifikat", detail: "Kelola sertifikat keikutsertaan setelah seluruh periode ujian berakhir.", icon: GraduationCap },
  ];
  const steps = [
    ["1. Siapkan angkatan", "Buat angkatan dan atur pembukaan pendaftarannya.", "angkatan"],
    ["2. Daftarkan peserta", "Impor Excel atau isi formulir, lalu tentukan angkatan dan kelompok peserta.", "pendaftaran"],
    ["3. Siapkan materi & ujian", "Unggah audio dan PDF, lalu atur soal serta jadwal ujian harian, pekanan, dan akhir.", "materi"],
    ["4. Pantau periode belajar", "Periksa data peserta dan siapkan sertifikat keikutsertaan setelah seluruh tenggat ujian berakhir.", "sertifikat"],
  ];
  return <div className="min-w-0 space-y-6">
    <AdminHeading title={`Ahlan wa sahlan, ${user.name}`} description="Kelola angkatan, peserta, materi, ujian, dan sertifikat Insan Academy." action={<Button asChild><Link href="/admin/academy/angkatan">Siapkan angkatan <ArrowRight /></Link></Button>} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <MetricCard label="Angkatan" value={stats.cohorts} detail="Seluruh angkatan Academy" icon={<Layers />} />
      <MetricCard label="Peserta aktif" value={stats.participants} detail="Akun peserta yang masih aktif" icon={<Users />} tone="blue" />
      <MetricCard label="Materi" value={stats.lessons} detail="Materi audio dan PDF, termasuk draft" icon={<BookOpen />} tone="violet" />
      <MetricCard label="Ujian" value={stats.exams} detail="Ujian harian, pekanan, dan akhir" icon={<ClipboardList />} tone="amber" />
    </div>
    <section aria-labelledby="academy-admin-workflow" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <h2 id="academy-admin-workflow" className="font-semibold">Alur pengelolaan Academy</h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{steps.map(([title, detail, href]) => <li key={title}><Link href={`/admin/academy/${href}`} className="block h-full rounded-xl bg-white p-4 hover:ring-1 hover:ring-emerald-400"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p></Link></li>)}</ol>
    </section>
    <section aria-labelledby="academy-admin-manage">
      <h2 id="academy-admin-manage" className="mb-4 text-base font-semibold text-slate-900">Kelola Academy</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shortcuts.map(item => <Link key={item.href} href={`/admin/academy/${item.href}`} className="group"><Card className="h-full border-slate-200 shadow-sm transition-colors group-hover:border-emerald-300"><CardContent className="flex items-start gap-4 p-5"><span className="rounded-lg bg-slate-50 p-2.5 text-emerald-600"><item.icon className="size-5" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-slate-900">{item.title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{item.detail}</p></div><ArrowRight className="mt-3 size-4 shrink-0 text-slate-300 group-hover:text-emerald-600" /></CardContent></Card></Link>)}</div>
    </section>
    <Card className="border-emerald-100 bg-emerald-50/50 shadow-none"><CardHeader className="p-5 pb-2"><h2 className="text-sm font-semibold text-emerald-900">Sebelum membuka pembelajaran</h2></CardHeader><CardContent className="px-5 pb-5"><p className="max-w-3xl text-sm leading-6 text-slate-600">Pastikan peserta terdaftar pada angkatan yang sesuai, materi sudah dipublikasikan, serta soal dan kunci jawaban ujian sudah lengkap. Tetapkan waktu mulai dan berakhir setiap ujian. Sertifikat keikutsertaan tersedia bagi seluruh peserta setelah semua tenggat ujian berakhir.</p><Button asChild variant="link" className="mt-2 h-auto p-0"><Link href="/admin/academy/kuis">Periksa ujian <ArrowRight /></Link></Button></CardContent></Card>
  </div>;
}
