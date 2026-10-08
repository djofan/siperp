export interface QuizQuestionView {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
}

/** Pilihan jawaban yang terisi saja (C & D opsional). */
export function optionsOf(question: QuizQuestionView) {
  return (
    [
      ["a", question.optionA],
      ["b", question.optionB],
      ["c", question.optionC],
      ["d", question.optionD],
    ] as const
  ).filter((entry): entry is readonly ["a" | "b" | "c" | "d", string] => !!entry[1]);
}
