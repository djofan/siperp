import { cache } from "react";
import { apiRequest } from "@/lib/api";

interface LazsipStatistics {
  totalDana: number;
  totalDonatur: number;
  totalPenerima: number;
  totalMitra: number;
}

// Share one database snapshot between sections within a render, without caching across requests.
export const getLazsipStatistics = cache(() => apiRequest<LazsipStatistics>("lazsip/statistics"));
