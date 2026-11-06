import "server-only";
import { ApiError, apiRequest } from "@/lib/api";
import type { Response1, Response2, Response3, Response5, Response10 } from "./contracts";
import type { WorkflowTicket, WarrantyTicket } from "./workflow";

export const newTicketData = (warranty?:string) => apiRequest<Response2 & {warrantyTickets: WarrantyTicket[]}>(`teknisi/new-ticket${warranty?`?warranty=${encodeURIComponent(warranty)}`:""}`);
export const outletData = () => apiRequest<Response3["outlets"]>("teknisi/outlets");
export const profileData = () => apiRequest<Response10["profile"]>("teknisi/profile");
export const peopleData = (q = "", page = 1) => apiRequest<Response5>(`teknisi/people?${new URLSearchParams({ q: q.slice(0, 100), page: String(page) })}`);
export async function ticketData(id: string) {
  try { return await apiRequest<Omit<Response1, "ticket"> & {ticket: WorkflowTicket}>(`teknisi/tickets/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
