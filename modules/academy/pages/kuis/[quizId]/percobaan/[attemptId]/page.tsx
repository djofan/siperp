import { academyServerHref } from "@/modules/academy/pwa/server-navigation";
import { notFound, redirect } from "next/navigation";
import { requireAcademyProfile } from "../../../../../api/access";
import { getOwnAttempt, updateAttempt, remainingQuizSeconds } from "../../../../../api/quizzes";
import { readSnapshot } from "../../../../../api/policy";
import { QuizPlayer } from "../../../../../components/QuizPlayer";
import { PageHeading } from "../../../../../components/ui";

export default async function AttemptPage({ params }: { params: Promise<{ quizId: string; attemptId: string }> }) {
  const { profileId } = await requireAcademyProfile();
  const { quizId, attemptId } = await params;
  const attempt = await getOwnAttempt(profileId, quizId, attemptId);
  if (!attempt) notFound();
  const snapshot = readSnapshot(attempt.answers);
  const remainingSeconds = remainingQuizSeconds(attempt.startedAt, snapshot.timeLimitMinutes, snapshot.closesAt);
  if (attempt.isCompleted) redirect(await academyServerHref(`/academy/kuis/${quizId}/hasil/${attemptId}`));
  if (remainingSeconds <= 0) {
    await updateAttempt(profileId, attemptId, { submit: true });
    redirect(await academyServerHref(`/academy/kuis/${quizId}/hasil/${attemptId}`));
  }
  return <div className="mx-auto max-w-3xl px-4 py-12"><PageHeading eyebrow={`Percobaan ${attempt.attemptNumber}`} title={attempt.quiz.title} />
    <QuizPlayer key={attemptId} attemptId={attemptId} remainingSeconds={remainingSeconds} responses={snapshot.responses} questions={snapshot.questions.map((question) => ({ id: question.id, question: question.question, type: question.type, weight: question.weight, mediaMime: question.mediaMime, mediaName: question.mediaName, mediaAlt: question.mediaAlt, options: question.options.map((option) => ({ id: option.id, label: option.label })) }))} />
  </div>;
}
