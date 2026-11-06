import { apiRequest } from "@/lib/api";

export async function listRecentActivity(limit = 8) {
  return apiRequest<{ id: string; message: string; createdAt: Date }[]>(`core/activity?limit=${limit}`);
}
export async function countAccessChangesLast7Days() {
  return (await apiRequest<{ accessChanges: number }>("core/overview")).accessChanges;
}
