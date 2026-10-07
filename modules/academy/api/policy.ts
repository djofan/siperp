export interface QuizSnapshot {
  passingScore: number;
  timeLimitMinutes: number;
  closesAt?: string | null;
  questions: { id: string; question: string; explanation?: string | null; type?: "SINGLE" | "TRUE_FALSE" | "MULTIPLE"; weight?: number; options: { id: string; label: string; isCorrect: boolean }[] }[];
  responses: Record<string, string | string[]>;
}

export function readSnapshot(value: unknown): QuizSnapshot {
  if (!value || typeof value !== "object") throw new Error("Data percobaan tidak valid.");
  const data = value as QuizSnapshot;
  if (!Array.isArray(data.questions) || !data.responses || !Number.isFinite(data.passingScore) || !Number.isFinite(data.timeLimitMinutes)) {
    throw new Error("Data percobaan tidak valid.");
  }
  return data;
}

export function gradeQuiz(snapshot: QuizSnapshot) {
  let earned = 0, possible = 0;
  for (const question of snapshot.questions) {
    const weight = question.weight ?? 1;
    if (!Number.isInteger(weight) || weight < 1 || weight > 100) throw new Error("Bobot soal tidak valid.");
    possible += weight;
    const correct = question.options.filter(option => option.isCorrect).map(option => option.id);
    const selected = selectedOptions(snapshot.responses[question.id]);
    if (correct.length && selected.length === correct.length && new Set(selected).size === selected.length && selected.every(id => correct.includes(id))) earned += weight;
  }
  const score = possible ? Math.round(earned / possible * 10000) / 100 : 0;
  return { score, passed: snapshot.questions.length > 0 && score >= snapshot.passingScore };
}

export function selectedOptions(value: string | string[] | undefined) { return Array.isArray(value) ? value : value ? [value] : []; }

export function quizDeadline(startedAt: Date, minutes: number, closesAt?: string | null) {
  const deadline = startedAt.getTime() + minutes * 60_000;
  return closesAt ? Math.min(deadline, new Date(closesAt).getTime()) : deadline;
}

export function lessonReleased(startsAt: Date | null, releaseDay: number, now = new Date()) {
  if (!startsAt) return false;
  const day = (date: Date) => Math.floor((date.getTime() + 7 * 3600_000) / 86400_000);
  return now >= startsAt && day(now) - day(startsAt) + 1 >= releaseDay;
}

export function normalizePhone(value: string) {
  const digits = value.replace(/[\s()+-]/g, "");
  const normalized = digits.startsWith("0") ? "62" + digits.slice(1) : digits;
  return /^62[1-9]\d{7,12}$/.test(normalized) ? normalized : null;
}

export function weightedGrade(quizzes: { id: string; kind: "DAILY" | "WEEKLY" | "FINAL" }[], attempts: { quizId: string; score: number }[], weights = { DAILY: 20, WEEKLY: 30, FINAL: 50 }) {
  const best = new Map<string, number>();
  for (const attempt of attempts) best.set(attempt.quizId, Math.max(best.get(attempt.quizId) ?? 0, attempt.score));
  const means = { DAILY: 0, WEEKLY: 0, FINAL: 0 };
  for (const kind of ["DAILY", "WEEKLY", "FINAL"] as const) {
    const group = quizzes.filter(quiz => quiz.kind === kind);
    means[kind] = group.length ? group.reduce((sum, quiz) => sum + (best.get(quiz.id) ?? 0), 0) / group.length : 0;
  }
  return { means, score: Math.round((means.DAILY * weights.DAILY + means.WEEKLY * weights.WEEKLY + means.FINAL * weights.FINAL)) / 100,
    complete: ["DAILY", "WEEKLY", "FINAL"].every(kind => quizzes.some(quiz => quiz.kind === kind)) && quizzes.every(quiz => best.has(quiz.id)) };
}

export function isCourseComplete(totalLessons: number, completedLessons: number, totalQuizzes: number, passedQuizzes: number) {
  return totalLessons > 0 && totalLessons === completedLessons && totalQuizzes === passedQuizzes;
}

export function safeResourceUrl(value: string | null | undefined): string | null {
  if (!value || [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return null;
  if (/^\/(?!\/|\\)/.test(value) && !value.includes("\\")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function videoEmbedUrl(provider: string, value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (provider === "YOUTUBE" && ["youtube.com", "www.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname)) {
      const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") ?? url.pathname.split("/")[2];
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (provider === "VIMEO" && ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
      const id = url.pathname.split("/").filter(Boolean).at(-1);
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (provider === "BUNNY" && ["iframe.mediadelivery.net", "player.mediadelivery.net"].includes(url.hostname) && url.pathname.startsWith("/embed/")) return url.href;
    return null;
  } catch { return null; }
}
