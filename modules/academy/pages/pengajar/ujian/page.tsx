import { examStatus } from "../../../exam-status";
import Link from "@/modules/academy/pwa/AcademyNavigation";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyTeacherExamList } from "@/contracts/modules/academy";
import { requireAcademyTeacher } from "../../../api/access";
import { saveTeacherQuiz } from "../../../api/teacher-actions";
import { QuizForm } from "../../../components/admin/QuizForm";
import { TeacherPagination } from "../../../components/TeacherPagination";
import { PageHeading, inputClass } from "../../../components/ui";

const kinds = { DAILY: "Harian", WEEKLY: "Mingguan", FINAL: "Evaluasi akhir" };
const date = (value: string | null) => value ? new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
}).format(new Date(value)) : "Belum diatur";

export default async function ExamsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAcademyTeacher();
  const query = await searchParams;
  const saved = query.saved === "created" ? "Ujian berhasil dibuat." : query.saved === "updated" ? "Ujian berhasil diperbarui." : null;
  const cohort = typeof query.cohort === "string" ? query.cohort.slice(0, 191) : "";
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const data = await academyPage<AcademyTeacherExamList>(
    `academy/teacher/quizzes?${new URLSearchParams({ view: "table", cohort, page: String(page) })}`,
  );
  return <div className="mx-auto max-w-7xl p-4 md:p-6">
    <PageHeading title="Soal & ujian">Kelola jadwal ujian dan soal untuk setiap angkatan dan bab.</PageHeading>
    {saved && <p role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">{saved} {query.visibility === "published" ? "Ujian diaktifkan; peserta dapat mengerjakan sesuai jadwal." : query.visibility === "draft" ? "Status: Draft. Tambahkan soal dan periksa jadwal sebelum mengaktifkan." : ""}</p>}
    <details id="tambah-ujian" open={query.tambah === "1"} className="mb-6 rounded-2xl border border-gray-100 bg-white p-5">
      <summary className="cursor-pointer font-semibold text-green-700">Buat ujian</summary>
      <div className="mt-4"><QuizForm creating action={saveTeacherQuiz.bind(null, null)} chapters={data.chapters}/></div>
    </details>
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white" aria-label="Daftar ujian">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 p-5">
        <div><h2 className="font-semibold">Daftar ujian</h2><p className="mt-1 text-sm text-gray-500">{data.total} ujian ditemukan</p></div>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Filter angkatan<select name="cohort" defaultValue={cohort} className={inputClass}>
            <option value="">Semua angkatan</option>{data.cohorts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select></label>
          <button className="rounded-xl bg-green-700 px-4 py-3 text-sm font-medium text-white">Terapkan</button>
          {cohort && <Link href="/academy/pengajar/ujian" className="px-2 py-3 text-sm text-gray-600 underline">Reset</Link>}
        </form>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm">
        <thead className="bg-gray-50 text-gray-600"><tr>{["No.", "Ujian", "Angkatan", "Bab", "Jenis", "Jadwal (WIB)", "Durasi", "Soal", "Status", "Aksi"].map(label => <th scope="col" key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{data.items.map((quiz, index) => <tr key={quiz.id} className="hover:bg-gray-50">
          <td className="px-4 py-4 text-gray-500">{(data.page - 1) * 10 + index + 1}</td>
          <td className="max-w-xs break-words px-4 py-4 font-medium">{quiz.title}</td>
          <td className="px-4 py-4">{quiz.cohortTitle}</td><td className="px-4 py-4">{quiz.kind === "DAILY" ? quiz.chapterTitle : "Semua bab"}</td>
          <td className="px-4 py-4">{kinds[quiz.kind]}</td>
          <td className="px-4 py-4 text-xs"><p>Mulai: {date(quiz.quizDate)}</p><p className="mt-1">Tutup: {date(quiz.closesAt)}</p></td>
          <td className="px-4 py-4">{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} menit` : "Belum diatur"}</td>
          <td className="px-4 py-4">{quiz.questionCount}</td>
          <td className="px-4 py-4"><span className={`inline-block rounded-full px-2.5 py-1 text-xs ${examStatus(quiz).tone}`}>{examStatus(quiz).label}</span></td>
          <td className="px-4 py-4"><div className="flex min-w-max flex-wrap gap-2">
            <Link href={`/academy/pengajar/ujian/${quiz.id}?edit=ujian#edit-ujian`} className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800">Edit ujian</Link>
            <Link href={`/academy/pengajar/ujian/${quiz.id}#daftar-soal`} className="rounded-lg border border-green-700 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50">Kelola soal</Link>
          </div></td>
        </tr>)}{!data.items.length && <tr><td colSpan={10} className="px-5 py-12 text-center text-gray-500">Belum ada ujian{cohort ? " pada angkatan ini" : ""}. <Link href="?tambah=1#tambah-ujian" className="text-green-700 underline">Buat ujian pertama</Link>, simpan draft, lalu tambahkan soal sebelum mengaktifkan.</td></tr>}</tbody>
      </table></div>
      <TeacherPagination {...data} base="/academy/pengajar/ujian" cohort={cohort}/>
    </section>
  </div>;
}
