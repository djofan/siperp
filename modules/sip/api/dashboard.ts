import { apiRequest } from "@/lib/api";
import { cache } from "react";
import { listPenyaluranBantuan } from "./penyaluranBantuan";

interface Dashboard {
  counts: { programCount: number; publishedNewsCount: number; penyaluranCount: number; laporanCount: number };
  perYear: { year: number; count: number }[];
  coverage: { months: { year: number; month: number; uploaded: boolean }[]; lastYear: number; hasTahunanLastYear: boolean };
  summary: { newsDraft: number; newsPinned: number; programPinned: number; laporanTahunan: number; lastPenyaluranDate: Date | null };
}
const dashboard = cache(() => apiRequest<Dashboard>("sip/dashboard"));
export async function getDashboardCounts() { return (await dashboard()).counts; }
export async function getRecentPenyaluranBantuan(limit = 5) { return (await listPenyaluranBantuan()).slice(0, limit); }
export async function getPenyaluranPerYear() { return (await dashboard()).perYear; }
export async function getLaporanCoverage() { return (await dashboard()).coverage; }
export async function getContentSummary() { return (await dashboard()).summary; }
