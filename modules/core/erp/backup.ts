import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
export type BackupSummary = { id: string; size: number; createdAt: string; tables?: number; rows?: number; files?: number };
export const backupRoot = path.resolve(/* turbopackIgnore: true */ process.env.ERP_BACKUP_DIR ?? ".erp-backups");
export const validBackupId = (id: string) => /^erp-\d{8}T\d{9}Z-[a-f0-9]{8}\.sipbak$/.test(id);
export async function runBackup(command: "create" | "verify" | "list", id?: string): Promise<BackupSummary | BackupSummary[]> {
  if (id && !validBackupId(id)) throw new Error("ID backup tidak valid.");
  const run = promisify(execFile);
  const result = await run(process.execPath, [path.join(/* turbopackIgnore: true */ process.cwd(), "scripts", "erp-backup.mjs"), command, ...(id ? [id] : [])], { cwd: process.cwd(), timeout: 180000, maxBuffer: 1024 * 1024, windowsHide: true });
  return JSON.parse(result.stdout);
}
