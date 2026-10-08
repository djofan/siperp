import { cn } from "@/lib/utils";
import { Icon } from "@/modules/tanwir/components/icons";
import { optionsOf, type QuizQuestionView } from "./quiz-options";

// Pembahasan jawaban kuis (setelah dikumpulkan): pilihan peserta vs kunci.
export function QuizReview({
  questions,
  answers,
}: {
  questions: (QuizQuestionView & { correctOption?: string })[];
  answers: { questionId: string; selectedOption: string; isCorrect: boolean }[];
}) {
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  return (
    <ol className="space-y-3">
      {questions.map((question, index) => {
        const answer = byQuestion.get(question.id);
        return (
          <li key={question.id} className="rounded-2xl bg-tanwir-surface p-5 ring-1 ring-tanwir-line">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium leading-relaxed">
                <span className="mr-2 tabular-nums text-tanwir-muted">{index + 1}.</span>
                {question.question}
              </p>
              {answer && (
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", answer.isCorrect ? "bg-tanwir-success-soft text-tanwir-success" : "bg-tanwir-danger-soft text-tanwir-danger")}>
                  <Icon name={answer.isCorrect ? "check" : "x"} className="h-4 w-4" />
                </span>
              )}
            </div>
            <ul className="mt-3 grid gap-1.5 text-sm">
              {optionsOf(question).map(([key, label]) => {
                const chosen = answer?.selectedOption === key;
                const correct = question.correctOption === key;
                return (
                  <li
                    key={key}
                    className={cn(
                      "flex gap-3 rounded-lg px-3 py-2",
                      correct ? "bg-tanwir-success-soft text-tanwir-success" : chosen ? "bg-tanwir-danger-soft text-tanwir-danger" : "text-tanwir-muted",
                    )}
                  >
                    <span className="w-4 font-semibold uppercase">{key}</span>
                    <span className="flex-1">{label}</span>
                    {chosen && <span className="text-xs font-medium">Jawaban</span>}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
