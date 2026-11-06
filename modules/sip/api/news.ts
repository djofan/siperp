import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { SipNews } from "@/contracts/modules/sip";

export async function listNewsForAdmin() { return apiCollection<SipNews>("sip/admin/news"); }
export async function listPublishedNews() { return apiCollection<SipNews>("sip/news"); }
export async function getNewsById(id: string) {
  try { return await apiRequest<SipNews>(`sip/admin/news/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export async function getPublishedNewsById(id: string) {
  try { return await apiRequest<SipNews>(`sip/news/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
