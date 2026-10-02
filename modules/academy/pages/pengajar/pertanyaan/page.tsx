import { prisma } from "@/lib/prisma";
import { requireAcademyTeacher } from "../../../api/access";
import { answerParticipant } from "../../../api/actions";
import { ActionForm } from "../../../components/ActionForm";
import { PageHeading, inputClass, EmptyState } from "../../../components/ui";
export default async function QuestionsPage() {
  await requireAcademyTeacher();
  const questions = await prisma.academyDiscussion.findMany({ orderBy: [{ answeredAt: "asc" }, { createdAt: "desc" }], take: 100, select: { id: true, question: true, answer: true, profile: { select: { user: { select: { name: true } } } }, course: { select: { title: true } } } });
  return <div className="mx-auto max-w-4xl p-4 md:p-6"><PageHeading title="Pertanyaan peserta">Baca pertanyaan dan kirim jawaban pribadi kepada peserta.</PageHeading>{!questions.length && <EmptyState>Belum ada pertanyaan.</EmptyState>}<div className="space-y-4">{questions.map(question => <article key={question.id} className="rounded-2xl border border-gray-100 bg-white p-5"><p className="text-xs text-gray-500">{question.profile.user.name} · {question.course.title}</p><p className="my-4 whitespace-pre-wrap text-sm leading-7">{question.question}</p><ActionForm action={answerParticipant.bind(null, question.id)} label="Simpan jawaban"><label className="text-sm">Jawaban<textarea name="answer" required maxLength={10000} defaultValue={question.answer ?? ""} rows={5} className={inputClass} /></label></ActionForm></article>)}</div></div>;
}
