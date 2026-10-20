import "server-only";
import { ApiError, apiRequest } from "@/lib/api";
import type { Response1, Response2, Response3, Response5, Response10 } from "./contracts";

export const newTicketData = () => apiRequest<Response2>("teknisi/new-ticket");
export const outletData = () => apiRequest<Response3["outlets"]>("teknisi/outlets");
export const profileData = () => apiRequest<Response10["profile"]>("teknisi/profile");
export const peopleData = (q = "", page = 1) => apiRequest<Response5>(`teknisi/people?${new URLSearchParams({ q: q.slice(0, 100), page: String(page) })}`);
export async function ticketData(id: string) {
  try { return await apiRequest<Response1>(`teknisi/tickets/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
