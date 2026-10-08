import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { getStudentTaskDetail } from "@/modules/tanwir/api/submissions";
import { submitQuizAction } from "@/modules/tanwir/api/actions/peserta";
import { MediaSubmit } from "@/modules/tanwir/components/app/MediaSubmit";
import { QuizForm } from "@/modules/tanwir/components/app/QuizForm";
import { QuizReview } from "@/modules/tanwir/components/app/QuizReview";
import { ReviewHistory } from "@/modules/tanwir/components/app/ReviewHistory";
import { submissionFileUrl } from "@/modules/tanwir/components/app/media";
import { Icon } from "@/modules/tanwir/components/icons";
import { Card, LatePill, Notice, ScoreBadge, SectionTitle, TaskStatePill, TypePill, deadlineLabel, formatDateTime } from "@/modules/tanwir/components/ui";

export default async function PesertaTaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selesai?: string }>;
}) {
  const viewer = await requireTanwirMember("peserta");
  const { id } = await params;
  const { selesai } = await searchParams;
  const detail = await getStudentTaskDetail(id, viewer.member);
  if (!detail) notFound();
  const { task, submission, questions, locked, state } = detail;
  const lastRejection = submission?.status === "rejected" ? submission.logs.find((log) => log.status === "rejected") : null;

  return (
    <div className="space-y-6">
      <Link href="/tanwir/peserta/tugas" className="inline-flex items-center gap-1.5 text-sm text-tanwir-muted hover:text-tanwir-ink">
        <Icon name="arrowLeft" className="h-4 w-4" />
        Kembali ke tugas
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <TypePill type={task.type} />
          <TaskStatePill state={state} />
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{task.title}</h1>
        <p className="mt-2 text-sm text-tanwir-muted">
          {task.teacher ? `${task.teacher.user.name} · ` : ""}Tenggat {formatDateTime(task.deadline)} ({deadlineLabel(task.deadline)})
        </p>
      </header>

      {selesai && submission?.score != null && (
        <Notice tone="success">
          Kuis terkumpul. Nilai Anda {submission.score}
          {submission.isLate ? " — dikumpulkan setelah tenggat awal (terlambat)." : "."}
        </Notice>
      )}

      <Card>
        <SectionTitle>Perintah</SectionTitle>
        <p className="whitespace-pre-line leading-relaxed">{task.description}</p>
      </Card>

      {submission && (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle>Pengumpulan Anda</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {submission.score != null && <ScoreBadge score={submission.score} />}
              <LatePill late={submission.isLate} />
            </div>
          </div>
          <p className="-mt-3 text-sm text-tanwir-muted">
            Percobaan ke-{submission.attemptsCount} · dikirim {formatDateTime(submission.submittedAt)}
          </p>
          {submission.fileMime &&
            (submission.fileMime.startsWith("video") && task.type === "video" ? (
              <video src={submissionFileUrl(submission.id)} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-tanwir-ink" />
            ) : (
              <audio src={submissionFileUrl(submission.id)} controls preload="metadata" className="w-full" />
            ))}
          {task.type !== "quiz" && (
            <div>
              <p className="mb-3 text-sm font-medium">Riwayat koreksi</p>
              <ReviewHistory logs={submission.logs} />
            </div>
          )}
        </Card>
      )}

      {task.type === "quiz" && submission && <QuizReview questions={questions} answers={submission.answers} />}

      {detail.canSubmit && task.type !== "quiz" && (
        <Card>
          <SectionTitle>{submission ? "Kirim ulang setoran" : "Kirim setoran"}</SectionTitle>
          {lastRejection?.feedback && (
            <div className="mb-5">
              <Notice tone="danger">
                <span className="font-medium">Catatan guru:</span> {lastRejection.feedback}
              </Notice>
            </div>
          )}
          <MediaSubmit taskId={task.id} type={task.type} resubmit={!!submission} />
        </Card>
      )}

      {detail.canSubmit && task.type === "quiz" && (
        <section>
          <SectionTitle>Kerjakan kuis · {questions.length} soal</SectionTitle>
          <QuizForm questions={questions} action={submitQuizAction.bind(null, task.id)} />
        </section>
      )}

      {locked && !submission && <Notice tone="warning">Tenggat sudah lewat. Minta guru memperpanjang tenggat bila Anda masih perlu mengerjakan.</Notice>}
      {locked && submission?.status === "rejected" && <Notice tone="warning">Tenggat sudah lewat, setoran tidak bisa dikirim ulang. Minta guru memperpanjang tenggat.</Notice>}
    </div>
  );
}
