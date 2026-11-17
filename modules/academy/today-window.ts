import type { AcademyActivity } from "@/contracts/modules/academy-today";

export function currentActivity<T extends AcademyActivity>(item: T | null, now: number): T | null {
  if (!item) return null;
  const start = Date.parse(item.opensAt), end = Date.parse(item.closesAt);
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && now < end ? item : null;
}
