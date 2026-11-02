import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { LazsipActivity } from "@/contracts/modules/lazsip";
export async function listActivities() { return apiCollection<LazsipActivity>("lazsip/activities"); }
export async function getActivityById(id: string) {
  try { return await apiRequest<LazsipActivity>(`lazsip/activities/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
