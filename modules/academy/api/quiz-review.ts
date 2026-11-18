"use server";

import { apiRequest, ApiError } from "@/lib/api";
import type { QuestionValues } from "../components/admin/QuestionForm";

export async function loadQuizReviewQuestions(id: string): Promise<{ questions: QuestionValues[]; error: string }> {
  try {
    // Existing non-paginated endpoint checks Academy admin/teacher access in Laravel.
    const data = await apiRequest<{ quiz: { questions: QuestionValues[] } }>(`academy/teacher/quizzes/${encodeURIComponent(id)}`);
    return { error: "", questions: data.quiz.questions.map(q => ({ id: q.id, question: q.question, explanation: q.explanation, type: q.type, weight: q.weight, order: q.order,
      mediaMime: q.mediaMime, mediaName: q.mediaName, mediaAlt: q.mediaAlt, options: q.options.map(o => ({ id: o.id, label: o.label, isCorrect: o.isCorrect })) })) };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Seluruh soal belum dapat dimuat. Periksa koneksi lalu coba lagi.", questions: [] };
  }
}
