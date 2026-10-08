import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOjolMember } from "@/modules/ojol/api/access";
import { getSubmissionForReview } from "@/modules/ojol/api/submissions";
import { reviewAction } from "@/modules/ojol/api/actions/guru";
import { QuizReview } from "@/modules/ojol/components/app/QuizReview";
import { ReviewForm } from "@/modules/ojol/components/app/ReviewForm";
import { ReviewHistory } from "@/modules/ojol/components/app/ReviewHistory";
import { submissionFileUrl } from "@/modules/ojol/components/app/media";
import { Icon } from "@/modules/ojol/components/icons";
import { Card, LatePill, ScoreBadge, SectionTitle, SubmissionPill, TypePill, formatDateTime } from "@/modules/ojol/components/ui";

export const metadata = { title: "Tinjau Setoran" };

export default async function GuruReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireOjolMember("guru");
  const { id } = await params;
  const submission = await getSubmissionForReview(id, viewer.member.id);
  if (!submission) notFound();
  const { task, student } = submission;
  const isQuiz = task.type === "quiz";
  const questions = submission.answers.map((answer) => answer.question).sort((a, b) => a.order - b.order);
  const answers = submission.answers;

  return (
    <div className="space-y-6">
      <Link href={`/ojol/guru/tugas/${task.id}`} className="inline-flex items-center gap-1.5 text-sm text-ojol-muted hover:text-ojol-ink">
        <Icon name="arrowLeft" className="h-4 w-4" />
        {task.title}
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <TypePill type={task.type} />
          <SubmissionPill status={submission.status} />
          <LatePill late={submission.isLate} />
          {submission.score != null && <ScoreBadge score={submission.score} />}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{student.user.name}</h1>
        <p className="mt-1 text-sm text-ojol-muted">
          {student.code}
          {student.group ? ` · ${student.group.name}` : ""}
          · percobaan ke-{submission.attemptsCount} · {formatDateTime(submission.submittedAt)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {submission.fileMime && (
            <Card>
              <SectionTitle>Setoran</SectionTitle>
              {submission.fileMime.startsWith("video") && task.type === "video" ? (
                <video src={submissionFileUrl(submission.id)} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-ojol-ink" />
              ) : (
                <audio src={submissionFileUrl(submission.id)} controls preload="metadata" className="w-full" />
              )}
            </Card>
          )}
          {isQuiz && <QuizReview questions={questions} answers={answers} />}
          <Card>
            <SectionTitle>Perintah tugas</SectionTitle>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ojol-muted">{task.description}</p>
          </Card>
        </div>

        <div className="space-y-6">
          {submission.status === "pending" && !isQuiz && (
            <Card>
              <SectionTitle>Koreksi</SectionTitle>
              <ReviewForm action={reviewAction.bind(null, submission.id)} />
            </Card>
          )}
          {!isQuiz && (
            <Card>
              <SectionTitle>Riwayat koreksi</SectionTitle>
              <ReviewHistory logs={submission.logs} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
