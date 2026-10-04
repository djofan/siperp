import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { UsersIcon, ShieldIcon, GridIcon } from "@/components/ui/icons";
import { panelClasses } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/utils";
import { countUsers } from "@/modules/core/users";
import { countActiveModules } from "@/modules/core/modules";
import { listRecentActivity, countAccessChangesLast7Days } from "@/modules/core/activity";
import { requireSuperadmin } from "@/modules/core/erp/access";
import { OperationalOverview } from "@/modules/core/erp/OperationalOverview";

export default async function SuperadminOverviewPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireSuperadmin();
  const period = await searchParams;
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
        description="Ringkasan akun, dana, bantuan, pembelajaran, dan pekerjaan lintas modul."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<UsersIcon className="h-5 w-5" />} label="Total akun terdaftar" value={totalUsers} />
        <StatCard icon={<ShieldIcon className="h-5 w-5" />} label="Modul aktif" value={totalActiveModules} />
        <StatCard icon={<GridIcon className="h-5 w-5" />} label="Perubahan akses (7 hari)" value={accessChanges7d} />
      </div>

      <OperationalOverview from={period.from} to={period.to} />
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-foreground/60">Aktivitas Terbaru</h2>
        {recentActivity.length === 0 ? (
          <EmptyState className="py-12">Belum ada aktivitas.</EmptyState>
        ) : (
          <ul className={panelClasses("divide-y divide-border")}>
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
