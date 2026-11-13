import Link from "next/link";
import type { AcademyTeacherProgress } from "@/contracts/modules/academy";
import { TeacherPagination } from "../../../components/TeacherPagination";
import { inputClass } from "../../../components/ui";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage14 } from "@/modules/academy/api/page-contracts";
import { requireAcademyTeacher } from "../../../api/access";
import { PageHeading, EmptyState } from "../../../components/ui";
import { ParticipantSupport } from "../../../components/ParticipantSupport";

export default async function GradesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyTeacher();
  const query = await searchParams;
  const tabs = <nav className="mb-5 flex gap-3"><Link className="rounded-xl border p-3 text-sm" href="/academy/pengajar/nilai">Progres belajar</Link><Link className="rounded-xl border p-3 text-sm" href="/academy/pengajar/nilai?tab=nilai">Rincian nilai ujian</Link></nav>;
  if (query.tab !== "nilai") {
    const cohort = typeof query.cohort === "string" ? query.cohort.slice(0, 191) : "";
    const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
    const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? 1)) || 1));
    const data = await academyPage<AcademyTeacherProgress>(`academy/teacher/progress?${new URLSearchParams({ cohort, q, page: String(page) })}`);
    return <div className="mx-auto max-w-7xl p-4 md:p-6"><PageHeading title="Progres peserta">Pantau materi selesai, ujian yang belum dikerjakan, dan nilai sementara. Hanya materi dan ujian terpublikasi yang dihitung.</PageHeading>{tabs}
      <form className="mb-5 flex flex-wrap items-end gap-3"><label className="text-sm">Cari peserta<input name="q" defaultValue={q} maxLength={100} className={inputClass}/></label><label className="text-sm">Angkatan<select name="cohort" defaultValue={cohort} className={inputClass}><option value="">Semua angkatan</option>{data.cohorts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><button className="rounded-xl bg-green-700 p-3 text-sm text-white">Terapkan</button></form>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-gray-50"><tr>{["Peserta", "Angkatan", "Materi selesai", "Ujian belum dikerjakan", "Nilai sementara", "Progres materi"].map(label => <th scope="col" key={label} className="p-4">{label}</th>)}</tr></thead><tbody className="divide-y">{data.items.map(item => <tr key={item.id}><td className="p-4 font-medium">{item.name}<span className="block text-xs font-normal">{item.nis}</span></td><td className="p-4">{item.cohortTitle}</td><td className="p-4">{item.completedLessons}/{item.totalLessons}</td><td className="p-4">{item.pendingExams}</td><td className="p-4">{item.score.toFixed(2)}</td><td className="p-4"><progress value={item.percent} max={100} aria-label={`Progres materi ${item.name}`} className="w-24 accent-green-700"/> {item.percent}%</td></tr>)}{!data.items.length && <tr><td colSpan={6} className="p-8 text-center text-gray-500">Tidak ada peserta yang sesuai filter.</td></tr>}</tbody></table></div><TeacherPagination page={data.page} lastPage={data.pages} total={data.total} base="/academy/pengajar/nilai" cohort={cohort} filters={{ q }}/></section>
    </div>;
  }
  const { courses } = await academyPage<AcademyPage14>("academy/teacher/grades");
  return <div className="mx-auto max-w-6xl p-4 md:p-6"><PageHeading title="Nilai semua peserta">Nilai terbaik per ujian. Ujian yang belum dikerjakan dihitung nol pada nilai sementara.</PageHeading>{tabs}<ParticipantSupport />{courses.map(course => <section key={course.id} className="mb-8"><h2 className="mb-3 font-semibold">{course.title}</h2>{!course.people.length ? <EmptyState>Belum ada peserta.</EmptyState> : <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">Nilai peserta {course.title}</caption><thead className="bg-gray-50"><tr>{["Peserta", "Harian", "Mingguan", "Per bab", "Nilai berbobot", "Predikat", "Status"].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{course.people.map(person => <tr key={person.profileId}><th className="px-4 py-4 font-medium">{person.name}<span className="block text-xs font-normal text-gray-500">{person.nis}</span><details className="mt-2 font-normal"><summary className="cursor-pointer text-xs text-green-700">Rincian ujian</summary><ul className="mt-2 space-y-1">{course.quizzes.map(quiz => <li key={quiz.id} className="text-xs">{quiz.title}: {person.grade.best[quiz.id] === undefined ? "Belum dikerjakan" : person.grade.best[quiz.id].toFixed(2)}</li>)}</ul></details></th>{(["DAILY", "WEEKLY", "FINAL"] as const).map(kind => <td key={kind} className="px-4 py-4">{person.grade.means[kind].toFixed(2)}</td>)}<td className="px-4 py-4 font-semibold">{person.grade.score.toFixed(2)}</td><td className="px-4 py-4">{person.grade.predicate}</td><td className="px-4 py-4">{person.grade.complete ? "Lengkap" : "Sementara"}</td></tr>)}</tbody></table></div>}</section>)}</div>;
}
