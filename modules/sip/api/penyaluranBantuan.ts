import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { SipPenyaluranBantuan } from "@/lib/domain";

export async function listPenyaluranBantuan() { return apiCollection<SipPenyaluranBantuan>("sip/penyaluran-bantuan"); }
export async function getPenyaluranBantuanById(id: string) {
  try { return await apiRequest<SipPenyaluranBantuan>(`sip/penyaluran-bantuan/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
