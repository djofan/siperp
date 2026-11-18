import "server-only";
import { apiRequest, ApiError } from "@/lib/api";

export type ProgressSummary = {
  completedQuizzes: number; totalQuizzes: number; allCompleted: boolean;
  score: number; predicate: string; finalCompleted: boolean; averageScore: number | null;
};
export type ProgressPerson = { id: string; name: string; nis: string | null; gender: "IKHWAN" | "AKHWAT" | null; active: boolean };
export type ProgressDirectory = {
  cohorts: { id: string; title: string }[]; cohort: { id: string; title: string } | null;
  items: (ProgressPerson & ProgressSummary)[]; total: number; page: number; pages: number;
  totalQuizzes: number; fullyCompletedParticipants: number;
};
export type ProgressDetail = {
  cohort: { id: string; title: string }; person: ProgressPerson; summary: ProgressSummary;
  quizzes: { id: string; title: string; kind: "DAILY" | "WEEKLY" | "FINAL"; number: number;
    status: "completed" | "expired" | "missed" | "inactive" | "upcoming" | "in_progress" | "not_started";
    score: number | null; startedAt: Date | null; submittedAt: Date | null; opensAt: Date | null; closesAt: Date | null; timeLimitMinutes: number }[];
};
export function getAdminProgress(query: URLSearchParams) {
  return apiRequest<ProgressDirectory>(`academy/admin/progress?${query}`);
}
export async function getAdminProgressDetail(profileId: string, cohort: string) {
  try {
    return await apiRequest<ProgressDetail>(`academy/admin/progress/${encodeURIComponent(profileId)}?${new URLSearchParams({ cohort })}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
