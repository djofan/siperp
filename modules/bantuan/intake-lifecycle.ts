import type { AidApplication } from "@/contracts/modules/bantuan";

export const editableIntakeStates = ["draft", "needs_data", "screening"];
export function canRestoreIntake(status: string, editing: boolean): boolean {
  return (editing ? editableIntakeStates : ["draft", "needs_data"]).includes(status);
}

// The server commit is authoritative. A failed device-cache cleanup must never
// turn a successful submission into an error that encourages sending it again.
export async function submitIntake({ save, submit, committed, cleanup }: {
  save: () => Promise<AidApplication>;
  submit: (row: AidApplication) => Promise<AidApplication>;
  committed: (row: AidApplication) => void;
  cleanup: () => Promise<void>;
}): Promise<{ row: AidApplication; cleanupFailed: boolean }> {
  const saved = await save();
  if (!editableIntakeStates.includes(saved.status)) throw new Error("Tahap pengajuan sudah berubah. Buka kembali melalui daftar pengajuan.");
  const row = saved.status === "screening" ? saved : await submit(saved);
  if (!["screening", "review1", "bypass_review"].includes(row.status)) throw new Error("Pengajuan belum dikonfirmasi terkirim oleh server. Periksa kembali statusnya.");
  committed(row);
  try { await cleanup(); return { row, cleanupFailed: false }; }
  catch { return { row, cleanupFailed: true }; }
}
