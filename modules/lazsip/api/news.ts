import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { LazsipNews } from "@/contracts/modules/lazsip";
export async function listNewsForAdmin() { return apiCollection<LazsipNews>("lazsip/admin/news"); }
export async function listPublishedNews() { return apiCollection<LazsipNews>("lazsip/news"); }
export async function getNewsById(id: string) {
  try { return await apiRequest<LazsipNews>(`lazsip/admin/news/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export async function getPublishedNewsById(id: string) {
  try { return await apiRequest<LazsipNews>(`lazsip/news/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
