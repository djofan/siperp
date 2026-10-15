import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { LazsipCampaign } from "@/lib/domain";
export type CampaignView = LazsipCampaign & { donorCount: number };
export interface CampaignHistoryEntry {
  id: string;
  kind: "donasi" | "penyesuaian";
  label: string;
  amount: number;
  createdAt: Date;
}
export async function listCampaigns() { return apiCollection<CampaignView>("lazsip/campaigns"); }
export async function getCampaignById(id: string) {
  try { return await apiRequest<CampaignView>(`lazsip/campaigns/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export async function getCampaignPaidTotals(ids: string[]) { return new Map((await listCampaigns()).filter(item => ids.includes(item.id)).map(item => [item.id, item.currentAmount])); }
export async function getCampaignDonorCounts(ids: string[]) { return new Map((await listCampaigns()).filter(item => ids.includes(item.id)).map(item => [item.id, item.donorCount])); }
export async function listCampaignHistory(id: string) { return apiCollection<CampaignHistoryEntry>(`lazsip/campaigns/${encodeURIComponent(id)}/history`); }
