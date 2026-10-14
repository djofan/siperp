export const stages = { pending: "Pending Service", process: "Proses Service", ready: "Ready · Siap diambil", finish: "Finish", cancelled: "Dibatalkan" } as const;
export const stageStatuses = { pending: ["received"], process: ["diagnosis", "approval", "repairing", "paused"], ready: ["ready"], finish: ["collected"], cancelled: ["cancelled"] };
export const qualityChecks = ["Layar & sentuh", "Pengisian daya", "Suara & mikrofon", "Kamera", "Jaringan", "Keluhan utama"];
export const paymentMethods = ["Tunai", "Transfer", "QRIS"];
export function stageOf(status: string) { return Object.entries(stageStatuses).find(([, values]) => values.includes(status))?.[0] ?? "pending"; }
export function checkFinalAmount(value: number) { if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000) throw new Error("Total tagihan tidak valid."); return value; }
