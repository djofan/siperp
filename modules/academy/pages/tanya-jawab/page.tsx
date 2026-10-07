import { prisma } from "@/lib/prisma";
import { requireAcademyProfile } from "../../api/access";
import { askTeacher } from "../../api/actions";
import { ActionForm } from "../../components/ActionForm";
import { PageHeading, EmptyState, inputClass } from "../../components/ui";
export default async function QuestionsPage() {
  const { profileId } = await requireAcademyProfile();
  const enrollments = await prisma.zakatAcademyEnrollment.findMany({ where: { profileId, course: { isPublished: true } }, select: { course: { select: { id: true, title: true, sessions: { orderBy: { startsAt: "asc" } } } } } });
  const questions = await prisma.academyDiscussion.findMany({ where: { profileId, courseId: { in: enrollments.map(item => item.course.id) } }, orderBy: { createdAt: "desc" }, take: 100 });
  return <div className="p-6"><PageHeading title="Tanya jawab Ustadz">Ajukan pertanyaan kepada Ustadz Irham dan ikuti sesi tanya jawab terjadwal.</PageHeading>
    {!enrollments.length && <EmptyState>Ikuti program terlebih dahulu untuk mengajukan pertanyaan.</EmptyState>}
    {enrollments.map(({ course }) => <section key={course.id} className="mb-5 rounded-2xl border border-gray-100 bg-white p-5"><h2 className="font-semibold">{course.title}</h2>{course.sessions.length ? course.sessions.map(session => <div key={session.id} className="my-4 rounded-xl bg-green-50 p-4"><p className="font-semibold">{session.title}</p><p className="mt-1 text-sm">{session.startsAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p><a href={session.joinUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-green-700">Buka sesi ↗</a></div>) : <p className="my-4 text-sm text-gray-500">Jadwal sesi akan diumumkan pengajar.</p>}<ActionForm action={askTeacher.bind(null, course.id)} label="Kirim pertanyaan"><label className="text-sm">Pertanyaan<textarea name="question" minLength={10} maxLength={3000} required rows={4} className={inputClass} /></label></ActionForm></section>)}
    <h2 className="mb-4 mt-8 font-semibold">Pertanyaan saya</h2><div className="space-y-4">{questions.map(question => <article key={question.id} className="rounded-2xl border border-gray-100 bg-white p-5"><p className="whitespace-pre-wrap text-sm leading-7">{question.question}</p><div className="mt-4 rounded-xl bg-green-50 p-4"><p className="text-xs font-semibold text-green-700">{question.answer ? "Jawaban pengajar" : "Menunggu jawaban"}</p>{question.answer && <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{question.answer}</p>}</div></article>)}</div>
  </div>;
}
