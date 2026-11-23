import { formatNumericText } from "@/lib/number-format";
import Link from "next/link";
import type { ProgressDetail, ProgressDirectory } from "../../api/admin-progress";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/FormField";
import { buttonVariants } from "@/components/ui/Button";
import { PageLinks, adminDate } from "./ParticipantUi";
import { AdminEmpty } from "./AdminUi";

const number = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
const scoreLabel = (final: boolean) => final ? "Nilai total hasil akhir" : "Nilai total sementara";
const kinds = { DAILY: "Ujian Harian", WEEKLY: "Ujian Pekanan", FINAL: "Ujian Akhir" };
const statuses = {
  completed: { text: "Selesai", className: "bg-green-50 text-green-800" },
  in_progress: { text: "Sedang dikerjakan", className: "bg-blue-50 text-blue-800" },
  expired: { text: "Waktu habis", className: "bg-amber-50 text-amber-800" },
  missed: { text: "Terlewat", className: "bg-amber-50 text-amber-800" },
  upcoming: { text: "Belum dibuka", className: "bg-gray-100 text-gray-700" },
  inactive: { text: "Nonaktif", className: "bg-gray-100 text-gray-700" },
  not_started: { text: "Belum dikerjakan", className: "bg-gray-100 text-gray-700" },
};

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return <Card><p className="text-sm text-foreground/60">{label}</p><p className="mt-3 text-2xl font-semibold tabular-nums">{children}</p></Card>;
}

export function ParticipantProgressDirectory({ data, search, group }: { data: ProgressDirectory; search: string; group: string }) {
  const cohort = data.cohort?.id ?? "";
  return <div className="space-y-6">
    <form action="/admin/academy/progres" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
      <label className="min-w-44 flex-1 text-sm">Angkatan<Select name="cohort" defaultValue={cohort} className="mt-2"><option value="" disabled>Pilih angkatan</option>{data.cohorts.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></label>
      <label className="min-w-44 flex-1 text-sm">Cari peserta<Input name="q" defaultValue={search} maxLength={100} placeholder="Nama atau NIP, misalnya PAZ003" className="mt-2" /></label>
      <label className="min-w-36 text-sm">Grup<Select name="group" defaultValue={group} className="mt-2"><option value="">Semua grup</option><option value="IKHWAN">Ikhwan</option><option value="AKHWAT">Akhwat</option></Select></label>
      <button className={buttonVariants({ variant: "secondary" })}>Tampilkan</button>
    </form>
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Peserta sesuai filter">{formatNumericText(data.total)}</Metric><Metric label="Ujian terpublikasi">{formatNumericText(data.totalQuizzes)}</Metric><Metric label="Peserta selesai seluruh ujian">{formatNumericText(data.fullyCompletedParticipants)}</Metric></div>
    <Card><CardTitle>{data.cohort ? `Progres ${data.cohort.title}` : "Progres Peserta"}</CardTitle>
      {!data.items.length ? <AdminEmpty>{data.cohorts.length ? "Tidak ada peserta yang sesuai dengan pencarian." : "Belum ada angkatan."}</AdminEmpty> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><caption className="sr-only">Progres ujian peserta {data.cohort?.title}</caption>
        <thead className="border-b border-border text-foreground/60"><tr>{["Peserta", "Grup", "Ujian selesai", "Nilai total", "Aksi"].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{data.items.map(p => <tr key={p.id}>
          <th className="p-3 font-medium">{p.name}<span className="mt-1 block font-mono text-xs text-foreground/60">{p.nis ?? "Tanpa NIP"}{!p.active && " · Akun nonaktif"}</span></th>
          <td className="p-3">{p.gender === "IKHWAN" ? "Ikhwan" : p.gender === "AKHWAT" ? "Akhwat" : "—"}</td>
          <td className="p-3"><strong className="tabular-nums">{formatNumericText(p.completedQuizzes)}/{formatNumericText(p.totalQuizzes)}</strong><p className="mt-1 text-xs text-foreground/60">{p.allCompleted ? "Semua ujian selesai" : p.totalQuizzes ? "Masih ada ujian belum selesai" : "Belum ada ujian"}</p></td>
          <td className="p-3"><strong className="tabular-nums">{number(p.score)}</strong><p className="mt-1 text-xs">{p.predicate}</p><p className="mt-1 text-xs text-foreground/60">{p.finalCompleted ? "Hasil akhir" : "Sementara"}</p></td>
          <td className="p-3"><Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`/admin/academy/progres/${p.id}?${new URLSearchParams({ cohort })}`}>Rincian ujian</Link></td>
        </tr>)}</tbody>
      </table></div>}
      <PageLinks {...data} base="/admin/academy/progres" query={{ cohort, q: search, group }} />
    </Card>
  </div>;
}

export function ParticipantProgressDetail({ data }: { data: ProgressDetail }) {
  const { summary, person } = data;
  return <div className="space-y-6">
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground/60"><p>NIP: <strong>{person.nis ?? "—"}</strong></p><p>{data.cohort.title}</p><p>{person.gender === "IKHWAN" ? "Ikhwan" : person.gender === "AKHWAT" ? "Akhwat" : "Grup belum diatur"}</p>{!person.active && <p>Akun nonaktif</p>}</div>
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Ujian selesai">{formatNumericText(summary.completedQuizzes)}/{formatNumericText(summary.totalQuizzes)}</Metric><Metric label={scoreLabel(summary.finalCompleted)}>{number(summary.score)}</Metric><Metric label="Rata-rata nilai ujian selesai">{summary.averageScore === null ? "—" : number(summary.averageScore)}</Metric></div>
    <Card><CardTitle>Rincian ujian</CardTitle><p className="mt-2 text-sm text-foreground/60">Periksa ujian yang sudah selesai, sedang dikerjakan, atau belum dikerjakan. Semua waktu menggunakan WIB.</p>
      {!data.quizzes.length ? <AdminEmpty>Belum ada ujian terpublikasi pada angkatan ini.</AdminEmpty> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><caption className="sr-only">Rincian ujian {person.name}</caption><thead className="border-b border-border text-foreground/60"><tr>{["Ujian", "Status", "Nilai", "Waktu mulai", "Waktu selesai"].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{data.quizzes.map(quiz => <tr key={quiz.id}>
        <th className="p-3 font-medium"><span className="mb-1 block text-xs text-foreground/60">{kinds[quiz.kind]}{quiz.kind !== "FINAL" && ` ${quiz.number}`}</span>{quiz.title}<span className="mt-1 block text-xs font-normal text-foreground/60">{formatNumericText(quiz.timeLimitMinutes)} menit · Berakhir {adminDate(quiz.closesAt)}</span></th>
        <td className="p-3"><span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statuses[quiz.status].className}`}>{statuses[quiz.status].text}</span>{quiz.status === "expired" && <p className="mt-2 max-w-44 text-xs text-foreground/60">Pengerjaan belum tercatat selesai.</p>}</td>
        <td className="p-3 font-semibold tabular-nums">{quiz.score === null ? "—" : number(quiz.score)}</td><td className="p-3 text-foreground/60">{adminDate(quiz.startedAt)}</td><td className="p-3 text-foreground/60">{adminDate(quiz.submittedAt)}</td>
      </tr>)}</tbody></table></div>}
    </Card>
  </div>;
}
