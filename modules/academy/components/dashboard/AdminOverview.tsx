import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ClipboardList, GraduationCap, Layers, Users, CheckCircle2 } from "lucide-react";
import { requireAcademyAdmin } from "../../api/admin-access";
import { curriculumStats } from "../../api/admin-curriculum";
import { AdminHeading } from "../admin/AdminUi";
import { MetricCard } from "../DashboardCards";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardContent } from "../ui/card";
export default async function AdminOverview() {
  const user = await requireAcademyAdmin();
  const stats = await curriculumStats();
  const shortcuts = [
    { href: "materi", title: "Program & materi", detail: "Susun bab, teks, dan audio pembelajaran.", icon: BookOpen },
    { href: "kuis", title: "Soal & evaluasi", detail: "Kelola soal, kunci jawaban, dan publikasi kuis.", icon: ClipboardList },
    { href: "peserta", title: "Peserta & progres", detail: "Pantau akun dan perkembangan belajar peserta.", icon: Users },
    { href: "peserta?tab=angkatan", title: "Pendaftaran & jadwal", detail: "Atur peserta, grup, dan tanggal mulai program.", icon: CalendarDays },
  ];
  return <div className="min-w-0 space-y-5"><AdminHeading title={`Selamat datang, ${user.name}`} description="Ringkasan pembelajaran dan akses cepat untuk mengelola Insan Academy." action={<Button asChild><Link href="/admin/academy/peserta?tab=angkatan">Siapkan angkatan <ArrowRight /></Link></Button>} />
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-semibold">Alur pengelolaan angkatan</h2><ol className="mt-4 grid gap-3 md:grid-cols-4">{[
      ["1. Siapkan angkatan", "Buat angkatan dan 12 bab, lalu tentukan jadwal belajar.", "peserta?tab=angkatan"],
      ["2. Daftarkan peserta", "Pastikan peserta masuk ke angkatan yang benar.", "peserta?tab=pendaftaran"],
      ["3. Siapkan pembelajaran", "Pengajar menambahkan materi dan menyiapkan soal ujian.", "materi"],
      ["4. Pantau hasil", "Periksa progres peserta dan persyaratan sertifikat.", "peserta"],
    ].map(([title, detail, href]) => <li key={title}><Link href={`/admin/academy/${href}`} className="block h-full rounded-xl bg-white p-4 hover:ring-1 hover:ring-emerald-400"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p></Link></li>)}</ol></section>
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <MetricCard label="Total program" value={stats.courses} detail="Seluruh program belajar" icon={<GraduationCap />} />
      <MetricCard label="Program terpublikasi" value={stats.published} detail="Program yang tampil kepada peserta" icon={<CheckCircle2 />} tone="blue" />
      <MetricCard label="Bab pembelajaran" value={stats.chapters} detail="Susunan kurikulum" icon={<Layers />} tone="violet" />
      <MetricCard label="Materi belajar" value={stats.lessons} detail="Materi teks dan audio" icon={<BookOpen />} tone="amber" />
    </div>
    <section><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">Kelola pembelajaran</h2><Badge variant="secondary">Admin Academy</Badge></div><div className="grid gap-4 sm:grid-cols-2">{shortcuts.map(item => <Link key={item.href} href={`/admin/academy/${item.href}`} className="group"><Card className="h-full border-slate-200 shadow-sm transition-colors group-hover:border-emerald-300"><CardContent className="flex items-start gap-4 p-5"><span className="rounded-lg bg-slate-50 p-2.5 text-emerald-600"><item.icon className="size-5" /></span><div className="flex-1"><h3 className="text-sm font-semibold text-slate-900">{item.title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{item.detail}</p></div><ArrowRight className="mt-3 size-4 text-slate-300 group-hover:text-emerald-600" /></CardContent></Card></Link>)}</div></section>
    <Card className="border-emerald-100 bg-emerald-50/50 shadow-none"><CardHeader className="p-5 pb-2"><h2 className="text-sm font-semibold text-emerald-900">Sebelum membuka pembelajaran</h2></CardHeader><CardContent className="px-5 pb-5"><p className="max-w-3xl text-sm leading-6 text-slate-600">Pastikan program dan bab terpublikasi, tanggal mulai sudah ditetapkan, serta peserta terdaftar di program yang sesuai. Tambahkan soal dan kunci jawaban sebelum mempublikasikan kuis.</p><Button asChild variant="link" className="mt-2 h-auto p-0"><Link href="/admin/academy/peserta?tab=angkatan">Periksa jadwal program <ArrowRight /></Link></Button></CardContent></Card>
  </div>;
}
