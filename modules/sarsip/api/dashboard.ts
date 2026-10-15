import { apiRequest } from "@/lib/api";
import { cache } from "react";
interface Dashboard {
  counts: { activeActivities: number; openCampaigns: number; totalBeneficiaries: number; pendingTransactions: number; totalDonors: number };
  totals: { donations: number; lastMonthDonations: number };
  top: { id: string; title: string; targetAmount: number; currentAmount: number }[];
  recent: { id: string; label: string; donorName: string; amount: number; status: string; createdAt: Date }[];
  daily: { date: string; total: number }[];
}
const dashboard = cache((limit = 5, days = 7) => apiRequest<Dashboard>(`sarsip/dashboard?limit=${limit}&days=${days}`));
export async function getDashboardCounts() { return (await dashboard()).counts; }
export async function getThisMonthTotals() { return (await dashboard()).totals; }
export async function getTopCampaigns(limit: number) { return (await dashboard(limit)).top; }
export async function getRecentTransactions(limit: number) { return (await dashboard(limit)).recent; }
export async function getDailyInflow(days: number) { return (await dashboard(5, days)).daily; }
