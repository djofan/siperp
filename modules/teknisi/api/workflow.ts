import type { Response1 } from "./contracts";

export type ServiceWorkflow = {
  id: string; ticketId: string; serviceType: "normal" | "warranty"; warrantyParentId: string | null;
  diagnosis: string | null; treatment: string | null; replacedParts: string | null; capital: number | null; finalPrice: number | null;
  warrantyDays: number; startedAt: Date | null; readyAt: Date | null; collectedAt: Date | null;
  warrantyUntil: Date | null; paymentMethod: string | null; receiverName: string | null;
  receiverPhone: string | null; cancelReason: string | null;
};
export type ServiceMedia = { id: string; stage: string; mime: string; ticketId: string };
export type WorkflowTicket = Response1["ticket"] & { workflow: ServiceWorkflow | null; media: ServiceMedia[]; warranty_source?: WorkflowTicket | null };
export type WarrantyTicket = { id: string; number: string; device: string; outletId: string; customerName: string; customerPhone: string };
export const pendingStatuses = ["received", "diagnosis", "approval", "waiting_parts"];
export function menuStatus(status:string) { return pendingStatuses.includes(status) ? "received" : status; }
export function selectedServiceMenu(path:string, root:string, status:string|null) {
  if(path !== `${root}/tiket` && !path.startsWith(`${root}/tiket/`))return null;
  if(status)return menuStatus(status);
  const operation=path.split("/").at(-1);
  if(operation==="start" || operation==="baru")return "received";
  if(operation==="complete")return "repairing";
  if(operation==="collect")return "ready";
  return null;
}
export function stageOperation(status: string) {
  if (pendingStatuses.includes(status)) return { operation: "start", label: "Kerjakan", destination: "repairing" };
  if (status === "repairing") return { operation: "complete", label: "Selesai", destination: "ready" };
  if (status === "ready") return { operation: "collect", label: "Sudah diambil", destination: "collected" };
  return null;
}
export function activeWarranty(ticket: {status: string; workflow: ServiceWorkflow | null}) {
  return ticket.status === "collected" && !!ticket.workflow?.warrantyUntil && new Date(ticket.workflow.warrantyUntil).getTime() > Date.now();
}
export function ticketOperation(ticket: {status: string; workflow: ServiceWorkflow | null}) {
  return ticket.status === "ready" && ticket.workflow?.finalPrice == null
    ? {operation:"complete",label:"Lengkapi hasil servis",destination:"ready"}
    : stageOperation(ticket.status);
}
