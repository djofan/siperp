import Link from "next/link";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { listAdminQuizzes } from "@/modules/academy/api/admin-quizzes";
import { AdminHeading, AddLink, AdminEmpty, PublishBadge } from "@/modules/academy/components/admin/AdminUi";
import { academyPage } from "../../../api/page-data";
import type { AcademyCohort } from "../../../api/page-contracts";
export default async function Page() {
  await requireAcademyAdmin();
  const [cohorts, result] = await Promise.all([academyPage<AcademyCohort[]>("academy/admin/cohorts"), listAdminQuizzes("", 1, "", true)]);
  const groups = cohorts.map(cohort => ({ id: cohort.id, title: cohort.title, items: result.items.filter(quiz => quiz.chapter.course.cohort?.id === cohort.id) }));
  const archive = result.items.filter(quiz => !quiz.chapter.course.cohort);
  if (archive.length) groups.push({ id: "unassigned", title: "Arsip belum memiliki angkatan", items: archive });
  return <><AdminHeading title="Ujian" description="Seluruh ujian dan pertanyaannya dikelola per angkatan." action={<AddLink href="/admin/academy/kuis/baru">Tambah ujian</AddLink>} />
    <div className="space-y-6">{groups.map(group => <section key={group.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5"><div><h2 className="font-semibold">{group.title}</h2><p className="mt-1 text-xs text-gray-500">{group.items.length} ujian</p></div>{group.id !== "unassigned" && <Link href={`/admin/academy/kuis/baru?cohort=${encodeURIComponent(group.id)}`} className="text-sm font-medium text-green-700">Tambah ujian →</Link>}</div>
      {group.items.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["No.", "Ujian", "Jenis Soal", "Status", "Aksi"].map(label => <th key={label} className="p-4 text-gray-500">{label}</th>)}</tr></thead><tbody>{group.items.map((quiz, index) => <tr key={quiz.id} className="border-t border-gray-100"><td className="p-4">{index + 1}</td><td className="p-4 font-semibold">{quiz.title}</td><td className="p-4">{quiz.questions.length ? [...new Set(quiz.questions.map(question => question.type === "TRUE_FALSE" ? "Benar / Salah" : question.type === "MULTIPLE" ? "Pilihan ganda (beberapa jawaban)" : "Pilihan ganda (satu jawaban)"))].join(", ") : "Belum ada soal"}</td><td className="p-4"><PublishBadge published={quiz.isPublished} /></td><td className="p-4"><Link className="text-green-700 hover:underline" href={`/admin/academy/program/${quiz.chapter.courseId}/bab/${quiz.chapter.id}/kuis/${quiz.id}`}>Edit ujian</Link></td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-gray-500">Belum ada ujian pada angkatan ini.</p>}
    </section>)}</div>{!groups.length && <AdminEmpty>Belum ada angkatan atau ujian.</AdminEmpty>}<p className="mt-5 text-sm text-gray-500">{result.total} ujian ditampilkan seluruhnya.</p>
  </>;
}
