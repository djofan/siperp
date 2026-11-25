import { requireAcademyAdmin } from "../../../../api/admin-access";
import { answerAdminDiscussion } from "../../../../api/admin-question-actions";
import { CopyQuestion } from "../../../../components/admin/CopyQuestion";
import Link from "@/modules/academy/pwa/AcademyNavigation";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyTeacherDiscussion } from "@/contracts/modules/academy";
import { requireAcademyTeacher } from "../../../../api/access";
import { answerTeacherDiscussion } from "../../../../api/teacher-actions";
import { ActionForm } from "../../../../components/ActionForm";
import { PageHeading, inputClass } from "../../../../components/ui";

export async function AnswerPanel({ params, searchParams, admin = false }: {
  admin?: boolean;
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (admin) await requireAcademyAdmin(); else await requireAcademyTeacher();
  const base = admin ? "/admin/academy/pertanyaan" : "/academy/pengajar/pertanyaan";
  const { id } = await params;
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const question = await academyPage<AcademyTeacherDiscussion>(`academy/teacher/questions/${encodeURIComponent(id)}`);
  return <div className="mx-auto max-w-3xl p-4 md:p-6">
    <Link href={`${base}?page=${page}`} className="mb-5 inline-block text-sm text-green-700 underline">Kembali ke daftar pertanyaan</Link>
    <PageHeading title={question.answer ? "Edit jawaban" : "Jawab pertanyaan"}>{question.profile.user.name} · {question.course.cohort?.title ?? question.course.title}</PageHeading>
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5"><h2 className="break-words font-semibold">{question.title || "Pertanyaan peserta"}</h2><p className="mt-2 text-xs text-gray-500">{new Date(question.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{question.question}</p>{admin && <CopyQuestion text={question.title ? `${question.title}\n\n${question.question}` : question.question} />}</section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <ActionForm action={(admin ? answerAdminDiscussion : answerTeacherDiscussion).bind(null, question.id, page)} label={admin ? "Sampaikan jawaban ke peserta" : "Simpan jawaban & kembali"}>
        <label className="block text-sm font-medium"><span>{admin ? "Jawaban dari ustadz" : "Jawaban"}<span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">*</span></span><textarea name="answer" required maxLength={10000} defaultValue={question.answer ?? ""} rows={8} className={inputClass}/></label>
        <p className="text-xs text-gray-500">Jawaban hanya dapat dilihat peserta yang bertanya dan pengelola. Setelah tersimpan, Anda kembali ke tabel pertanyaan.</p>
      </ActionForm>
    </section>
  </div>;
}

export default function AnswerPage(props: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AnswerPanel {...props} />;
}
