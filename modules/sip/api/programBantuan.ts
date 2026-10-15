import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { SipProgramBantuan } from "@/lib/domain";

export async function listProgramBantuan() { return apiCollection<SipProgramBantuan>("sip/program-bantuan"); }
export async function getProgramBantuanById(id: string) {
  try { return await apiRequest<SipProgramBantuan>(`sip/program-bantuan/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export { slugify } from "./slugify";
export async function getProgramBantuanBySlug(slug: string) {
  try { return await apiRequest<SipProgramBantuan>(`sip/program-bantuan/by-slug/${encodeURIComponent(slug)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
