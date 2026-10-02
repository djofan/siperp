export function examOpensAt(startsAt: Date | null, releaseDay: number, quizDate: Date | null) {
  if (!startsAt) return null;
  const day = 86400_000, offset = 7 * 3600_000;
  return new Date(Math.max(startsAt.getTime(), Math.floor((startsAt.getTime() + offset) / day) * day - offset + (releaseDay - 1) * day, quizDate?.getTime() ?? 0));
}
export function reviewAvailable(closesAt: Date | null, snapshotClosesAt?: string | null, now = new Date()) {
  if (!closesAt) return false;
  const original = snapshotClosesAt ? Date.parse(snapshotClosesAt) : 0;
  return Number.isFinite(original) && now.getTime() >= Math.max(closesAt.getTime(), original);
}
export function reminderState(opensAt: Date | null, closesAt: Date | null, completed: boolean, now = new Date()): "missed" | "upcoming" | "due" | "open" | null {
  if (!opensAt || completed) return null;
  if (closesAt && now >= closesAt) return "missed";
  if (now < opensAt) return opensAt.getTime() - now.getTime() <= 7 * 86400_000 ? "upcoming" : null;
  if (closesAt && closesAt.getTime() - now.getTime() <= 86400_000) return "due";
  return "open";
}
