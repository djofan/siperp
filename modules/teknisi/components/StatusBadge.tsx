import { isStatus, statuses } from "@/modules/teknisi/api/policy";
export function StatusBadge({ status }: { status: string }) {
  const color = status === "ready" || status === "collected" ? "bg-emerald-500/15 text-emerald-500" : status === "cancelled" ? "bg-red-500/15 text-red-400" : status === "waiting_parts" || status === "approval" ? "bg-amber-500/15 text-amber-500" : "bg-sky-500/15 text-sky-500";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${color}`}>{isStatus(status) ? statuses[status] : status}</span>;
}
