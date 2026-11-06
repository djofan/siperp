import { apiRequest, apiCollection, ApiError } from "@/lib/api";
export interface DonorSummary {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  types: ("infaq" | "zakat")[];
  totalContribution: number;
  contributionCount: number;
  lastContributionAt: Date;
}
export async function listDonors() { return apiCollection<DonorSummary>("lazsip/donors"); }
export async function getDonorSummaryById(id: string) {
  try { return await apiRequest<DonorSummary>(`lazsip/donors/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
async function totals() { return apiRequest<{ donations: number; zakat: number }>("lazsip/totals"); }
export async function getTotalDonationsPaid() { return (await totals()).donations; }
export async function getTotalZakatPaid() { return (await totals()).zakat; }
