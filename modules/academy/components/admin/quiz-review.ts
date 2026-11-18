import type { QuestionValues } from "./QuestionForm";

/** Read the current submitted form, not the original saved question props. */
export function readReviewQuestions(fields: FormData, initial: (QuestionValues | undefined)[]): QuestionValues[] {
  return initial.map((saved, index) => {
    const field = (name: string) => String(fields.get(`questions[${index}][${name}]`) ?? "");
    const parsed: unknown = JSON.parse(field("options"));
    if (!Array.isArray(parsed) || parsed.some(option => !option || typeof option.label !== "string" || typeof option.isCorrect !== "boolean")) {
      throw new Error("Pilihan jawaban belum dapat dibaca. Periksa kembali formulir soal.");
    }
    return { id: field("id") || undefined, question: field("question"), type: field("type") || "SINGLE", order: Number(field("order")), weight: Number(field("weight")) || 1,
      explanation: field("explanation"), options: parsed.map(option => ({ id: typeof option.id === "string" ? option.id : "", label: option.label, isCorrect: option.isCorrect })),
      mediaMime: saved?.mediaMime, mediaName: saved?.mediaName, mediaAlt: saved?.mediaAlt };
  });
}
