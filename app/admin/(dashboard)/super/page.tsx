import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { formatRelativeTime } from "@/lib/utils";
import { countUsers } from "@/modules/core/users";
import { countActiveModules } from "@/modules/core/modules";
import { listRecentActivity, countAccessChangesLast7Days } from "@/modules/core/activity";

export default async function SuperadminOverviewPage() {
  const [totalUsers, totalActiveModules, accessChanges7d, recentActivity] = await Promise.all([
    countUsers(),
    countActiveModules(),
    countAccessChangesLast7Days(),
    listRecentActivity(),
  ]);

  return (
    <div>
      <PageHeader
        title="Overview Superadmin"
        description="Ringkasan akun, modul, dan perubahan akses di seluruh platform."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total akun terdaftar" value={totalUsers} />
        <StatCard label="Modul aktif" value={totalActiveModules} />
        <StatCard label="Perubahan akses (7 hari)" value={accessChanges7d} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-foreground/60">Aktivitas Terbaru</h2>
        {recentActivity.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-foreground/40">
            Belum ada aktivitas.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {recentActivity.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <span className="text-foreground">{entry.message}</span>
                <span className="shrink-0 text-xs text-foreground/40">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
