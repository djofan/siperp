import { apiRequest } from "@/lib/api";
import { cache } from "react";
import type { CampaignView } from "./campaigns";
interface Dashboard { counts: { activeCampaigns: number; totalBeneficiaries: number; totalPartners: number; pendingTransactions: number; totalDonors: number }; totals: { donations: number; zakat: number; lastMonthDonations: number; lastMonthZakat: number }; top: CampaignView[]; recent: { id: string; label: string; donorName: string; amount: number; status: string; createdAt: Date }[]; daily: { date: string; total: number }[]; newApplicants: number; newVsRepeat: { newDonors: number; repeatDonors: number } }
const dashboard = cache((limit = 5, days = 30) => apiRequest<Dashboard>(`lazsip/dashboard?limit=${limit}&days=${days}`));
export async function getThisMonthTotals() { return (await dashboard()).totals; }
export async function getTopCampaigns(limit = 5) { return (await dashboard(limit)).top; }
export async function getRecentTransactions(limit = 10) { return (await dashboard(limit)).recent; }
export async function countNewApplicants() { return (await dashboard()).newApplicants; }
export async function getDashboardCounts() { return (await dashboard()).counts; }
export async function getNewVsRepeatDonorsThisMonth() { return (await dashboard()).newVsRepeat; }
export async function getDailyInflow(days = 30) { return (await dashboard(5, days)).daily; }
