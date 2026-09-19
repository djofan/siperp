import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { getAdminEnrollment } from "@/modules/academy/api/admin-participants";
import { adminPage } from "@/modules/academy/api/admin-participant-validation";
import { syncAcademyCompletion } from "@/modules/academy/api/actions";
import { AdminHeading, AdminEmpty } from "@/modules/academy/components/admin/AdminUi";
import { PageLinks, ProgressSummary, adminDate } from "@/modules/academy/components/admin/ParticipantUi";
import { SyncCompletionForm } from "@/modules/academy/components/admin/ParticipantForms";
export default async function Page({ params, searchParams }: {
  params: Promise<{ enrollmentId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAcademyAdmin();
  const { enrollmentId } = await params;
  const query = await searchParams;
  const data = await getAdminEnrollment(enrollmentId, adminPage(query.materi), adminPage(query.kuis));
  if (!data) notFound();
  const base = "/admin/academy/peserta/" + enrollmentId;
  const pagination = { materi: String(data.lessons.page), kuis: String(data.quizzes.page) };
  return <><AdminHeading title={data.profile.user.name} description={data.course.title + " · " + data.profile.user.email} backHref="/admin/academy/peserta" />
    <section className="space-y-4 rounded-2xl bg-surface p-6">
      <p className="text-sm text-foreground/60">NIS: {data.profile.nis ?? "—"} · Terdaftar {adminDate(data.createdAt)} · Akun {data.profile.user.isActive ? "aktif" : "nonaktif"}</p>
      {!data.course.isPublished && <p className="text-sm text-danger">Program sedang tidak dipublikasikan.</p>}
      <ProgressSummary value={data} />
      <p className="text-sm text-foreground">Tanggal selesai: {adminDate(data.completedAt)}</p>
      <SyncCompletionForm action={syncAcademyCompletion.bind(null, enrollmentId)} />
      {data.record && <Link href={"/admin/academy/sertifikat/" + data.record.id} className="inline-block text-sm text-accent hover:underline">Kelola catatan kelulusan & sertifikat</Link>}
    </section>
    <section className="mt-8"><h2 className="mb-4 text-xl font-bold text-foreground">Progres materi</h2>
      {data.lessons.items.length ? <div className="overflow-x-auto rounded-2xl bg-surface p-4"><table className="w-full text-left text-sm text-foreground"><thead><tr><th className="p-3">Materi / Bab</th><th className="p-3">Status</th><th className="p-3">Diselesaikan</th></tr></thead>
        <tbody>{data.lessons.items.map(lesson => <tr key={lesson.id} className="border-t border-border"><td className="p-3">{lesson.title}<p className="mt-1 text-xs text-foreground/60">{lesson.chapter.title}</p></td><td className="p-3">{lesson.lessonProgress[0]?.completed ? "Selesai" : "Belum selesai"}</td><td className="p-3">{adminDate(lesson.lessonProgress[0]?.completed ? lesson.lessonProgress[0].completedAt : null)}</td></tr>)}</tbody>
      </table></div> : <AdminEmpty>Tidak ada materi terpublikasi.</AdminEmpty>}
      <PageLinks {...data.lessons} base={base} query={pagination} pageKey="materi" />
    </section>
    <section className="mt-8"><h2 className="mb-4 text-xl font-bold text-foreground">Ringkasan kuis</h2>
      {data.quizzes.items.length ? <div className="overflow-x-auto rounded-2xl bg-surface p-4"><table className="w-full text-left text-sm text-foreground"><thead><tr>{["Kuis / Bab", "Percobaan selesai", "Nilai terbaik", "Status"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{data.quizzes.items.map(quiz => <tr key={quiz.id} className="border-t border-border"><td className="p-3">{quiz.title}<p className="mt-1 text-xs text-foreground/60">{quiz.chapter.title}</p></td><td className="p-3">{quiz.completedAttempts}</td><td className="p-3">{quiz.bestScore ?? "—"}</td><td className="p-3">{quiz.passed ? "Lulus" : "Belum lulus"}</td></tr>)}</tbody>
      </table></div> : <AdminEmpty>Tidak ada kuis terpublikasi.</AdminEmpty>}
      <PageLinks {...data.quizzes} base={base} query={pagination} pageKey="kuis" />
    </section>
  </>;
}

