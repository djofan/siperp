import "server-only";
import { apiRequest } from "@/lib/api";
import type { KeuanganOverview } from "@/contracts/modules/keuangan";

export function getKeuanganOverview() {
  return apiRequest<KeuanganOverview>("keuangan/overview");
}
