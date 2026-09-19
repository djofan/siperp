export interface QuizSnapshot {
  passingScore: number;
  timeLimitMinutes: number;
  questions: { id: string; question: string; options: { id: string; label: string; isCorrect: boolean }[] }[];
  responses: Record<string, string>;
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
  const correct = snapshot.questions.filter((question) => question.options.some(
    (option) => option.id === snapshot.responses[question.id] && option.isCorrect,
  )).length;
  const score = snapshot.questions.length ? Math.round(correct / snapshot.questions.length * 10000) / 100 : 0;
  return { score, passed: snapshot.questions.length > 0 && score >= snapshot.passingScore };
}

export function quizDeadline(startedAt: Date, minutes: number) {
  return startedAt.getTime() + minutes * 60_000;
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
