import { PageHeader } from "@/components/ui/PageHeader";
import { requireSuperadmin } from "./access";
import { runBackup, type BackupSummary } from "./backup";
import { ActionForm } from "./ActionForm";
import { createErpBackup, verifyErpBackup } from "./backup-actions";
export default async function BackupPage() {
  await requireSuperadmin();
  let backups: BackupSummary[] = [], error = false;
  try { const result = await runBackup("list"); if (Array.isArray(result)) backups = result; } catch { error = true; }
  return <div className="space-y-6"><PageHeader title="Backup & Pemulihan" description="Snapshot konsisten database dan file upload, dienkripsi AES-256-GCM. Akses hanya superadmin." />
    <section className="rounded-xl border border-border bg-surface p-5 space-y-3"><p className="text-sm">Backup meliputi seluruh tabel, file Academy, dan public/uploads. Batas snapshot aplikasi 256 MB. Jalankan saat tidak ada perubahan skema atau upload aktif.</p><ActionForm action={createErpBackup} button="Buat backup sekarang" /><p className="text-sm text-foreground/60">Kunci berasal dari ERP_BACKUP_KEY atau dibuat sekali di folder backup server sebagai backup-key.local. Simpan kunci di tempat terpisah; tanpa kunci, file backup tidak dapat dipulihkan.</p></section>
    {error && <p role="alert" className="text-red-600">Daftar backup tidak dapat dibaca. Periksa konfigurasi server.</p>}
    <div className="space-y-3">{backups.map(b => <article key={b.id} className="rounded-xl border border-border bg-surface p-4"><p className="break-all font-medium">{b.id}</p><p className="my-2 text-sm">{new Date(b.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} · {(b.size/1024/1024).toFixed(2)} MB</p><a className="mb-3 inline-block underline" href={`/api/super/erp/backup/${b.id}`}>Unduh backup terenkripsi</a><ActionForm action={verifyErpBackup} button="Verifikasi integritas"><input type="hidden" name="id" value={b.id} /></ActionForm></article>)}{!backups.length && !error && <p>Belum ada backup.</p>}</div>
    <section className="rounded-xl border border-border bg-surface p-5 space-y-3"><h2 className="font-semibold">Pemulihan melalui server</h2><p className="text-sm">Siapkan database dan folder kosong, isi ERP_RESTORE_DATABASE_URL, lalu jalankan perintah berikut. Pemulihan menolak database aktif dan target yang sudah berisi tabel. Setelah verifikasi, arahkan aplikasi ke database hasil pemulihan dan pasang folder uploadnya.</p><pre className="overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs">node scripts/erp-backup.mjs restore &lt;id-backup&gt; --confirm-empty-target --files-dir &lt;folder-kosong&gt;</pre><p className="text-sm">Jadwal backup dapat dijalankan melalui Task Scheduler atau scheduler server dengan perintah <code>npm run erp:backup</code>. Penjadwalan dan salinan ke penyimpanan lain perlu diatur pada server deployment.</p></section>
  </div>;
}
