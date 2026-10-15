import { apiRequest } from "@/lib/api";
export interface HistoryItem {
  trackingCode: string;
  type: "donasi" | "zakat";
  label: string;
  amount: number;
  status: string;
  createdAt: Date;
}
export async function getDonorTransactionHistory(id: string) { return apiRequest<HistoryItem[]>(`lazsip/donors/${encodeURIComponent(id)}/history`); }
