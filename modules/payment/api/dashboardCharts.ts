import { cache } from "react";
import { apiRequest } from "@/lib/api";
import type { ChartSummary } from "./chartData";
export const getDashboardCharts = cache(async (moduleSource: "lazsip" | "sarsip") => apiRequest<{ totals: { donations: number; zakat: number; lastMonthDonations: number; lastMonthZakat: number }; periods: ChartSummary[] }>(`payment/charts?moduleSource=${moduleSource}`));
