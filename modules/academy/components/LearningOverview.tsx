"use client";
import Link from "next/link";
import { useState } from "react";
import type { GetLearningOverviewResult, ListParticipantQuizzesResult } from "../api/courses";
import { AcademyIcon } from "./icons";
import { EmptyState, ProgressBar } from "./ui";

export function LearningOverview({ courses, quizzes, progress = false }: { courses: GetLearningOverviewResult; quizzes: ListParticipantQuizzesResult; progress?: boolean }) {
  const [tab, setTab] = useState("program");
  const lessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const completed = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  const percent = lessons ? Math.round(completed / lessons * 100) : 0;
  const attempts = quizzes.flatMap(quiz => quiz.attempts.filter(attempt => attempt.isCompleted).map(attempt => ({ ...attempt, quiz })));
  const average = attempts.length ? attempts.reduce((sum, attempt) => sum + Number(attempt.score ?? 0), 0) / attempts.length : 0;
  const stats = progress ? [
    { icon: "BookOpen", value: courses.length, label: "Program Diikuti" },
    { icon: "Trophy", value: completed, label: "Lesson Selesai" },
    { icon: "Progress", value: `${percent}%`, label: "Keseluruhan" },
    { icon: "Quiz", value: average.toFixed(1), label: "Rata-rata Ujian" },
  ] as const : [
    { icon: "BookOpen", value: courses.length, label: "Program Diikuti" },
    { icon: "PlayCircle", value: lessons, label: "Total Lesson" },
    { icon: "Trophy", value: completed, label: "Lesson Selesai" },
    { icon: "GraduationCap", value: `${percent}%`, label: "Progres" },
  ] as const;
  return <>
    <div className="academy-stats">{stats.map((stat, index) => <article className="academy-card academy-stat" key={stat.label}><span className={`academy-icon-tile ${index % 2 ? "academy-icon-warm" : ""}`}><AcademyIcon name={stat.icon} className="h-4 w-4" /></span><strong>{stat.value}</strong><span className="academy-muted">{stat.label}</span>{progress && index === 2 && <ProgressBar value={percent} />}</article>)}</div>
    {!progress && <section className="academy-section"><div className="academy-section-heading"><h2>Rekap Nilai Saya</h2><Link href="/academy/peringkat">Lihat Peringkat →</Link></div><div className="academy-card academy-score"><span className="academy-icon-tile"><AcademyIcon name="Trophy" className="h-6 w-6" /></span><div><p className="academy-muted">Nilai berbobot per pembelajaran</p>{courses.length ? courses.map(course => <div key={course.id} className="mt-2"><p className="text-sm">{course.title}</p><strong>{course.grading.score.toFixed(2)}</strong><p className="text-sm font-semibold text-green-700">{course.grading.predicate}</p><p className="academy-muted">{course.grading.complete ? "Rekap lengkap" : "Sementara; ujian yang belum dikerjakan dihitung nol."}</p></div>) : <p className="academy-muted">Belum ada rekap nilai.</p>}</div></div></section>}
    {progress ? <div role="tablist" aria-label="Kemajuan belajar" className="academy-tabs">{[{ id: "program", label: `Program (${courses.length})` }, { id: "history", label: `Riwayat Ujian (${attempts.length})` }].map(item => <button key={item.id} id={`tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls="learning-panel" onClick={() => setTab(item.id)}>{item.label}</button>)}</div> : <div className="academy-section-heading"><h2>Pembelajaran Saya</h2><Link href="/academy/materi">Jelajahi →</Link></div>}
    <div id="learning-panel" role={progress ? "tabpanel" : undefined} aria-labelledby={progress ? `tab-${tab}` : undefined} className="space-y-3">
      {tab === "history" ? attempts.length ? attempts.map(attempt => <article className="academy-card academy-program-row" key={attempt.id}><span className="academy-icon-tile"><AcademyIcon name="Quiz" className="h-5 w-5" /></span><div className="flex-1"><h3>{attempt.quiz.title}</h3><p className="academy-muted">{attempt.quiz.chapter.title} · Percobaan {attempt.attemptNumber}</p><p className="text-xs">Nilai {Number(attempt.score ?? 0).toFixed(1)} · {attempt.passed ? "Lulus" : "Belum lulus"}</p></div><Link className="academy-outline-button" href={`/academy/kuis/${attempt.quiz.id}/hasil/${attempt.id}`}>Lihat Detail →</Link></article>) : <EmptyState>Belum ada riwayat ujian.</EmptyState> : courses.length ? courses.map(course => <article className="academy-card academy-program-row" key={course.id}><span className="academy-icon-tile"><AcademyIcon name="BookOpen" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h3>{course.title}</h3><span className="text-xs">{course.percent}%</span></div><p className="academy-muted">{course.completedLessons}/{course.totalLessons} lesson selesai</p><div className="mt-3"><ProgressBar value={course.percent} /></div>{progress && <p className="academy-muted mt-3">Nilai berbobot: {course.grading.score.toFixed(2)} · {course.grading.predicate} · {course.grading.complete ? "Lengkap" : "Sementara"}</p>}</div><Link href={course.slug === "academy-materi" ? "/academy/materi" : `/academy/program/${course.slug}`} className="academy-primary-button">{progress ? "Lanjutkan →" : "Lanjut"}</Link></article>) : <EmptyState>Belum ada pembelajaran yang dimulai. <Link href="/academy/materi" className="text-green-700 underline">Jelajahi materi</Link>.</EmptyState>}
    </div>
  </>;
}
