import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { SipLaporan } from "@/contracts/modules/sip";

export async function getLaporanById(id: string) {
  try { return await apiRequest<SipLaporan>(`sip/laporan/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export async function listLaporan(type?: "bulanan" | "tahunan") { return apiCollection<SipLaporan>("sip/laporan" + (type ? `?type=${type}` : "")); }
