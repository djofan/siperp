import "server-only";
import { apiRequest } from "@/lib/api";
import type { AcademyToday, AcademyActivity } from "@/contracts/modules/academy-today";

export async function getTodayLearning(): Promise<AcademyToday> {
  const data = await apiRequest<AcademyToday>("academy/learning/today");
  // lib/api hydrates ISO timestamps as Date; client fetches receive ISO strings.
  const item = <T extends AcademyActivity>(value: T | null): T | null => value ? { ...value, opensAt: new Date(value.opensAt).toISOString(), closesAt: new Date(value.closesAt).toISOString() } : null;
  return { ...data, serverNow: new Date(data.serverNow).toISOString(), nextChangeAt: data.nextChangeAt ? new Date(data.nextChangeAt).toISOString() : null, material: item(data.material), exam: item(data.exam) };
}
