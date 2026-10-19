import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { LazsipPartner } from "@/lib/domain";
export async function listPartners() { return apiCollection<LazsipPartner>("lazsip/partners"); }
export async function getPartnerById(id: string) {
  try { return await apiRequest<LazsipPartner>(`lazsip/partners/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
