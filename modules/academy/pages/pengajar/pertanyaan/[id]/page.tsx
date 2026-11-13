import { listReturn } from "../../../../list-navigation";
import Link from "next/link";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyTeacherDiscussion } from "@/contracts/modules/academy";
import { requireAcademyTeacher } from "../../../../api/access";
import { answerTeacherDiscussion } from "../../../../api/teacher-actions";
import { ActionForm } from "../../../../components/ActionForm";
import { PageHeading, inputClass } from "../../../../components/ui";

export default async function AnswerPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAcademyTeacher();
  const { id } = await params;
  const query = await searchParams;
  const back = listReturn("/academy/pengajar/pertanyaan", query.back);
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const question = await academyPage<AcademyTeacherDiscussion>(`academy/teacher/questions/${encodeURIComponent(id)}`);
  return <div className="mx-auto max-w-3xl p-4 md:p-6">
    <Link href={back === "/academy/pengajar/pertanyaan" ? `/academy/pengajar/pertanyaan?page=${page}` : back} className="mb-5 inline-block text-sm text-green-700 underline">Kembali ke daftar pertanyaan</Link>
    <PageHeading title={question.answer ? "Edit jawaban" : "Jawab pertanyaan"}>{question.profile.user.name} · {question.course.cohort?.title ?? question.course.title}</PageHeading>
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-semibold">Pertanyaan peserta</h2><p className="mt-2 text-xs text-gray-500">{new Date(question.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{question.question}</p></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <ActionForm action={answerTeacherDiscussion.bind(null, question.id, page)} label="Simpan jawaban & kembali">
        <input type="hidden" name="back" value={back}/>
        <label className="block text-sm font-medium">Jawaban<textarea name="answer" required maxLength={10000} defaultValue={question.answer ?? ""} rows={8} className={inputClass}/></label>
        <p className="text-xs text-gray-500">Jawaban hanya dapat dilihat peserta yang bertanya dan pengelola. Setelah tersimpan, Anda kembali ke tabel pertanyaan.</p>
      </ActionForm>
    </section>
  </div>;
}
