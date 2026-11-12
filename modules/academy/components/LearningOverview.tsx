import Link from "next/link";
import type { GetOwnRankingsResult, ListParticipantQuizzesResult } from "../api/courses";
import { AcademyIcon } from "./icons";
import { EmptyState } from "./ui";

export function LearningOverview({ quizzes, rankings }: { quizzes: ListParticipantQuizzesResult; rankings: GetOwnRankingsResult }) {
  const attempts = quizzes.flatMap(quiz => quiz.attempts.filter(attempt => attempt.isCompleted).map(attempt => ({ ...attempt, quiz })));
  const completed = quizzes.filter(quiz => quiz.attempts.some(attempt => attempt.isCompleted)).length;
  const scored = attempts.filter(attempt => attempt.score !== null && Number.isFinite(Number(attempt.score)));
  const average = scored.length ? (scored.reduce((sum, attempt) => sum + Number(attempt.score), 0) / scored.length).toFixed(1) : "—";
  const stats = [
    { icon: "Progress", value: `${completed}/${quizzes.length}`, label: "Ujian selesai" },
    { icon: "Quiz", value: average, label: "Rata-rata nilai ujian" },
    { icon: "Trophy", value: rankings.length ? <>{rankings.map(item => <span key={item.courseId} className="block">{rankings.length > 1 && <span className="block text-xs font-normal">{item.title} · {item.finalCompleted ? "Hasil akhir" : "Sementara"}</span>}{item.score.toFixed(2)}</span>)}</> : "—", label: rankings.length > 0 && rankings.every(item => item.finalCompleted) ? "Hasil akhir" : "Nilai total sementara" },
  ] as const;
  return <>
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">{stats.map((stat, index) => <article className="academy-card academy-stat" key={stat.label}>
      <span className={`academy-icon-tile ${index % 2 ? "academy-icon-warm" : ""}`}><AcademyIcon name={stat.icon} className="h-4 w-4" /></span>
      <strong>{stat.value}</strong><span className="academy-muted">{stat.label}</span>
    </article>)}</div>
    <section aria-labelledby="exam-history-heading" className="academy-section">
      <div className="academy-section-heading"><h2 id="exam-history-heading">Riwayat ujian ({attempts.length})</h2><Link href="/academy/kuis">Lihat ujian →</Link></div>
      <div className="space-y-3">{attempts.length ? attempts.map(attempt => <article className="academy-card flex flex-wrap items-center gap-4 p-5" key={attempt.id}>
        <span className="academy-icon-tile"><AcademyIcon name="Quiz" className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{attempt.quiz.title}</h3>
          <p className="mt-1 text-sm">{attempt.score === null ? "Menunggu penilaian" : `Nilai ${Number(attempt.score).toFixed(1)}`}</p>
        </div>
        <Link className="academy-outline-button" href={`/academy/kuis/${attempt.quiz.id}#hasil-ujian`}>Lihat hasil →</Link>
      </article>) : <EmptyState>Belum ada riwayat ujian. Hasil akan tampil setelah Anda menyelesaikan ujian.</EmptyState>}</div>
    </section>
  </>;
}
