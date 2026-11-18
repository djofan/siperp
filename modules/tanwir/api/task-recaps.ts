import "server-only";
import { apiRequest } from "@/lib/api";
import type { TaskType, SubmissionStatus } from "./policy";
import type { ReviewLogView } from "../components/app/ReviewHistory";
import type { QuizQuestionView } from "../components/app/quiz-options";

export type RecapParams = Record<string, string | string[] | undefined>;
export function recapQuery(params: RecapParams, keys = ["group", "teacher", "type", "q", "status", "page"]) {
  const query = new URLSearchParams();
  for (const key of keys) if (typeof params[key] === "string" && params[key]) query.set(key, params[key]);
  return query;
}
export type RecapPerson = { id: string; code: string; name: string };
export type RecapGroup = { id: string; code: string; name: string; pic?: RecapPerson | null };
export type RecapCounts = { participants: number; submitted: number; missing: number; pending: number; approved: number; rejected: number };
export type RecapMeta = { current_page: number; last_page: number; total: number; per_page: number };
export type RecapTask = { id: string; title: string; description: string; type: TaskType; createdAt: Date; deadline: Date; originalDeadline: Date; teacher: RecapPerson | null; groups: RecapGroup[] };
export type RecapSubmission = { id: string; status: SubmissionStatus; score: number | null; attemptsCount: number; isLate: boolean; submittedAt: Date };
export type RecapQuestion = QuizQuestionView & { order: number; correctOption: string };
export type TaskRecapIndex = { tasks: (RecapTask & { counts: RecapCounts })[]; groups: RecapGroup[]; teachers: RecapPerson[]; meta: RecapMeta };
export type TaskRecapDetail = { task: RecapTask & { questions: RecapQuestion[] }; summary: RecapCounts; groups: RecapGroup[]; meta: RecapMeta; participants: (RecapPerson & { active: boolean; group: RecapGroup | null; currentlyAssigned: boolean; submission: RecapSubmission | null })[] };
export type SubmissionRecap = RecapSubmission & { task: RecapTask; student: RecapPerson & { group: { name: string } | null }; fileMime: string | null; files: { index: number; name: string; mime: string; size: number | null }[]; logs: ReviewLogView[]; answers: { questionId: string; selectedOption: string; isCorrect: boolean; question: RecapQuestion | null }[] };

export function getTaskRecaps(params: RecapParams) { return apiRequest<TaskRecapIndex>(`tanwir/admin/task-recaps?${recapQuery(params)}`); }
export function getTaskRecap(id: string, params: RecapParams) { return apiRequest<TaskRecapDetail>(`tanwir/admin/task-recaps/${encodeURIComponent(id)}?${recapQuery(params, ["group", "q", "status", "page"])}`); }
export function getSubmissionRecap(id: string) { return apiRequest<SubmissionRecap>(`tanwir/admin/task-recaps/submissions/${encodeURIComponent(id)}`); }
