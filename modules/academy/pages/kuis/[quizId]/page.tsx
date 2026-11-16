import Link from "@/modules/academy/pwa/AcademyNavigation";
import { notFound } from "next/navigation";
import { requireAcademyProfile } from "../../../api/access";
import { listParticipantQuizzes } from "../../../api/courses";
import { beginQuiz } from "../../../api/actions";
import { ActionForm } from "../../../components/ActionForm";
import { PageHeading, LearnerNav } from "../../../components/ui";
import { getOwnAttempt } from "../../../api/quizzes";
import { QuizReview } from "../../../components/QuizReview";
import { lessonReleased, readSnapshot } from "../../../api/policy";

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { profileId } = await requireAcademyProfile();
  const { quizId } = await params;
  const quizzes = await listParticipantQuizzes(profileId);
  const quiz = quizzes.find((item) => item.id === quizId);
  if (!quiz) notFound();
  const latest = quiz.attempts[0];
  const completed = quiz.attempts.find(attempt => attempt.isCompleted);
  const completedAttempt = completed ? await getOwnAttempt(profileId, quizId, completed.id) : null;
  const sequence = [...quizzes].filter(item => item.kind === quiz.kind).sort((a, b) => a.releaseDay - b.releaseDay || a.id.localeCompare(b.id));
  const number = sequence.findIndex(item => item.id === quiz.id) + 1;
  const ordinals = ["pertama", "kedua", "ketiga", "keempat", "kelima", "keenam", "ketujuh", "kedelapan", "kesembilan", "kesepuluh", "kesebelas", "kedua belas"];
  const label = quiz.kind === "FINAL" ? "Ujian akhir" : `${quiz.kind === "DAILY" ? "Ujian harian" : "Ujian pekanan"} ${ordinals[number - 1] ?? `ke-${number}`}`;
  const available = lessonReleased(quiz.chapter.course.startsAt, quiz.releaseDay) && quiz.isActive && (!quiz.quizDate || quiz.quizDate <= new Date()) && (!quiz.closesAt || quiz.closesAt > new Date());
  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><LearnerNav /><Link href="/academy/kuis" className="mb-5 inline-flex items-center text-sm font-medium text-green-700 hover:underline">← Kembali ke daftar ujian</Link><PageHeading title={quiz.title}>{quiz._count.questions} soal · {quiz.timeLimitMinutes} menit.</PageHeading>
    <section id="hasil-ujian" className={`scroll-mt-24 rounded-2xl border p-6 ${completed ? "border-green-300 bg-green-50" : "border-lazsip-primary-100 bg-white"}`}>
      <h2 className="mb-4 text-sm font-semibold capitalize">{label}</h2>
      {completed && <div role="status" className="mb-5"><p className="font-semibold text-green-800">✓ Ujian sudah selesai</p></div>}
      {(!completed || quiz.allowRetake) && <>
        <p className="mb-5 text-sm leading-7">Waktu dimulai saat Anda menekan tombol mulai dan tetap berjalan ketika halaman ditutup. Jawaban tersimpan saat dipilih. {quiz.allowRetake ? "Ujian ini boleh diulang." : "Ujian ini hanya dapat dikerjakan satu kali."}</p>
        {available && (!latest?.isCompleted || quiz.allowRetake) ? <ActionForm action={beginQuiz.bind(null, quiz.id)} label={latest && !latest.isCompleted ? "Lanjutkan ujian" : latest ? "Ulangi ujian" : "Mulai ujian"} /> : <p className="text-sm">Ujian belum dibuka, sudah berakhir, atau sedang dinonaktifkan.</p>}
      </>}
    </section>
    {completedAttempt?.isCompleted && <QuizReview snapshot={readSnapshot(completedAttempt.answers)} />}
  </div>;
}
