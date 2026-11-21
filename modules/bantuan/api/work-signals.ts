import type { AidDashboard, AidNotification } from "@/contracts/modules/bantuan";
import { request } from "./client";

export async function readWorkSignals(signal: AbortSignal) {
  // Independent results: a failed notification request must not hide current work.
  const [dashboard, notifications] = await Promise.allSettled([
    request<AidDashboard>("dashboard", { signal }),
    request<AidNotification[]>("notifications", { signal }),
  ]);
  return {
    dashboard: dashboard.status === "fulfilled" ? dashboard.value : null,
    notifications: notifications.status === "fulfilled" ? notifications.value : null,
    failed: dashboard.status === "rejected",
  };
}
