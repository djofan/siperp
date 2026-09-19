import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAcademyProfile } from "../../../api/access";
import { listParticipantQuizzes } from "../../../api/courses";
import { beginQuiz } from "../../../api/actions";
import { ActionForm } from "../../../components/ActionForm";
import { PageHeading, LearnerNav } from "../../../components/ui";

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { profileId } = await requireAcademyProfile();
  const { quizId } = await params;
  const quiz = (await listParticipantQuizzes(profileId)).find((item) => item.id === quizId);
  if (!quiz) notFound();
  const latest = quiz.attempts[0];
  const available = quiz.isActive && (!quiz.quizDate || quiz.quizDate <= new Date());
  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><LearnerNav /><PageHeading eyebrow={quiz.chapter.title} title={quiz.title}>{quiz._count.questions} soal · {quiz.timeLimitMinutes} menit · Nilai kelulusan {quiz.passingScore}.</PageHeading>
    <div className="rounded-2xl border border-lazsip-primary-100 bg-white p-6"><p className="mb-5 text-sm leading-7">Waktu dimulai saat Anda menekan tombol mulai dan tetap berjalan ketika halaman ditutup. Jawaban tersimpan saat dipilih. {quiz.allowRetake ? "Kuis ini boleh diulang." : "Kuis ini hanya dapat dikerjakan satu kali."}</p>
      {available && (!latest?.isCompleted || quiz.allowRetake) ? <ActionForm action={beginQuiz.bind(null, quiz.id)} label={latest && !latest.isCompleted ? "Lanjutkan percobaan" : latest ? "Ulangi kuis" : "Mulai kuis"} /> : <p className="text-sm">{!available ? "Kuis belum dibuka atau sedang dinonaktifkan." : "Anda sudah menyelesaikan kuis ini."}</p>}
      {quiz.quizDate && <p className="mt-4 text-sm">Jadwal: {quiz.quizDate.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>}
    </div>
    {quiz.attempts.length > 0 && <section className="mt-8"><h2 className="text-xl font-bold">Riwayat percobaan</h2><ul className="mt-4 divide-y divide-lazsip-primary-100">{quiz.attempts.map((attempt) => <li key={attempt.id} className="flex flex-wrap justify-between gap-3 py-4"><span>Percobaan {attempt.attemptNumber} · {attempt.isCompleted ? `Nilai ${Number(attempt.score ?? 0)} — ${attempt.passed ? "Lulus" : "Belum lulus"}` : "Sedang dikerjakan"}</span><Link className="font-semibold text-lazsip-primary-700" href={`/academy/kuis/${quiz.id}/${attempt.isCompleted ? "hasil" : "percobaan"}/${attempt.id}`}>{attempt.isCompleted ? "Lihat hasil" : "Lanjutkan"} →</Link></li>)}</ul></section>}
  </div>;
}
