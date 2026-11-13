import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, MessageCircle, Users } from "lucide-react";
import { academyPage } from "../../api/page-data";
import type { AcademyPage9 } from "../../api/page-contracts";
import { requireAcademyTeacher } from "../../api/access";
import { PageHeading } from "../ui";
import { ParticipantSupport } from "../ParticipantSupport";
import { MetricCard } from "../DashboardCards";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
export default async function TeacherOverview() {
  const user = await requireAcademyTeacher();
  const { materials, exams, questions, participants } = await academyPage<AcademyPage9>("academy/teacher/stats");
  const cards = [
    { href: "materi", title: "Materi teks & audio", detail: "Pilih angkatan dan bab, isi materi, lalu publikasikan.", icon: BookOpen },
    { href: "ujian", title: "Soal & ujian", detail: "Buat soal dan kunci jawaban, lalu jadwalkan evaluasi.", icon: ClipboardList },
    { href: "pertanyaan", title: "Pertanyaan peserta", detail: "Bantu peserta memahami materi yang dipelajari.", icon: MessageCircle },
    { href: "nilai", title: "Nilai & perkembangan", detail: "Lihat hasil ujian dan perkembangan peserta.", icon: Users },
  ];
  return <div className="space-y-7"><div className="flex flex-wrap items-start justify-between gap-4"><PageHeading eyebrow="Ruang pengajar" title={`Selamat datang, ${user.name}`}>Semua yang Anda perlukan untuk mendampingi pembelajaran.</PageHeading><Button asChild><Link href="/academy/pengajar/materi">Kelola materi <ArrowRight /></Link></Button></div>
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-semibold text-slate-900">Mulai dari sini</h2><p className="mt-1 text-sm text-slate-600">Ikuti alur berikut. Draft belum terlihat peserta.</p><ol className="mt-4 grid gap-3 md:grid-cols-5">{[
      ["Pilih angkatan", "Pastikan angkatan dan bab tujuan sudah tersedia.", "materi"],
      ["Tambah materi", "Isi teks, unggah audio atau rekam, lalu publikasikan.", "materi"],
      ["Buat ujian", "Pilih jenis, angkatan, durasi dan jadwal. Simpan draft.", "ujian"],
      ["Tambah soal", "Buka Kelola soal dan tentukan jawaban benar.", "ujian"],
      ["Aktifkan ujian", "Periksa ringkasan, lalu aktifkan untuk peserta.", "ujian"],
    ].map(([title, detail, href], index) => <li key={title}><Link href={`/academy/pengajar/${href}${index <= 2 ? "?tambah=1" : ""}`} className="block h-full rounded-xl border border-emerald-100 bg-white p-4 hover:border-emerald-400"><span className="text-xs font-semibold text-emerald-700">Langkah {index + 1}</span><h3 className="mt-2 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p></Link></li>)}</ol></section>
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"><MetricCard label="Materi belajar" value={materials} icon={<BookOpen />} /><MetricCard label="Ujian" value={exams} icon={<ClipboardList />} tone="blue" /><MetricCard label="Belum dijawab" value={questions} icon={<MessageCircle />} tone="amber" /><MetricCard label="Peserta aktif" value={participants} icon={<Users />} tone="violet" /></div>
    <section><h2 className="mb-4 text-base font-semibold text-slate-900">Ruang kerja pengajar</h2><div className="grid gap-4 sm:grid-cols-2">{cards.map(card => <Link key={card.href} href={`/academy/pengajar/${card.href}`} className="group"><Card className="h-full border-slate-200 shadow-sm transition-colors group-hover:border-emerald-300"><CardContent className="flex items-start gap-4 p-5"><span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600"><card.icon className="size-5" /></span><div className="flex-1"><h3 className="text-sm font-semibold text-slate-900">{card.title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{card.detail}</p></div><ArrowRight className="mt-3 size-4 text-slate-300 group-hover:text-emerald-600" /></CardContent></Card></Link>)}</div></section><ParticipantSupport compact />
  </div>;
}
