import type { SantunanRecord } from "@/contracts/modules/bantuan";

export function selectedPendingSantunan(visible: SantunanRecord[], selected: string[]): SantunanRecord[] {
  return visible.filter(row => row.transferStatus === "pending" && selected.includes(row.id));
}

// Use the existing authorized, version-checked endpoint for each record.
// Stop on the first failure so retries cannot silently repeat later items.
export async function transferSantunanSelection(
  rows: SantunanRecord[],
  send: (row: SantunanRecord) => Promise<unknown>,
): Promise<{ completed: number; error?: string }> {
  let completed = 0;
  for (const row of rows) {
    if (row.transferStatus !== "pending") continue;
    try {
      await send(row);
      completed++;
    } catch (error) {
      return { completed, error: error instanceof Error ? error.message : "Status transfer gagal diperbarui." };
    }
  }
  return { completed };
}
