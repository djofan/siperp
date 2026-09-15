import Link from "next/link";
import {
  getThisMonthTotals,
  getTopCampaigns,
  getRecentTransactions,
  countNewApplicants,
  getDashboardCounts,
  getDailyInflow,
} from "@/modules/lazsip/api/dashboard";
import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { DashboardStatCard } from "@/modules/lazsip/components/admin/DashboardStatCard";
import { InflowChart } from "@/modules/lazsip/components/admin/InflowChart";
import { AdminBadge } from "@/modules/lazsip/components/admin/AdminBadge";

const formatRupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;
const formatDateTime = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);

const STATUS_LABEL: Record<string, string> = { pending: "Menunggu", paid: "Lunas", failed: "Gagal" };
const STATUS_TONE: Record<string, "neutral" | "secondary" | "danger"> = { pending: "neutral", paid: "secondary", failed: "danger" };

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export default async function LazsipDashboardPage() {
  const [totals, topCampaigns, recentTransactions, newApplicants, counts, dailyInflow] = await Promise.all([
    getThisMonthTotals(),
    getTopCampaigns(5),
    getRecentTransactions(10),
    countNewApplicants(),
    getDashboardCounts(),
    getDailyInflow(30),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Dashboard" description="Ringkasan aktivitas LAZSIP — donasi, zakat, campaign, dan penyaluran bantuan." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          icon="fund"
          label="Donasi Bulan Ini"
          value={formatRupiah(totals.donations)}
          trend={{ value: percentChange(totals.donations, totals.lastMonthDonations), label: "vs bulan lalu" }}
        />
        <DashboardStatCard
          icon="zakat"
          label="Zakat Bulan Ini"
          value={formatRupiah(totals.zakat)}
          trend={{ value: percentChange(totals.zakat, totals.lastMonthZakat), label: "vs bulan lalu" }}
        />
        <DashboardStatCard icon="donors" label="Total Donatur & Muzakki" value={String(counts.totalDonors)} hint="Akumulasi transaksi lunas" />
        <DashboardStatCard icon="applicant" label="Pendaftar Baru" value={String(newApplicants)} hint="Menunggu diproses" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard icon="campaign" label="Campaign Aktif" value={String(counts.activeCampaigns)} />
        <DashboardStatCard icon="beneficiaries" label="Penerima Manfaat" value={String(counts.totalBeneficiaries)} />
        <DashboardStatCard icon="partners" label="Mitra Kerja Sama" value={String(counts.totalPartners)} />
        <DashboardStatCard icon="pending" label="Transaksi Menunggu" value={String(counts.pendingTransactions)} hint="Perlu ditinjau di Kelola Transaksi" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-lazsip-primary-100 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold text-lazsip-primary-900">Dana Masuk 30 Hari Terakhir</h2>
          <p className="mb-4 text-xs text-lazsip-primary-800/50">Total donasi + zakat berstatus lunas per hari.</p>
          <InflowChart data={dailyInflow} />
        </div>

        <div className="rounded-2xl border border-lazsip-primary-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-lazsip-primary-900">Campaign Terlaris</h2>
          {topCampaigns.length === 0 ? (
            <p className="text-sm text-lazsip-primary-800/50">Belum ada campaign aktif.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {topCampaigns.map((campaign, i) => {
                const percentage = Math.min(100, Math.round((campaign.currentAmount / campaign.targetAmount) * 100));
                return (
                  <Link
                    key={campaign.id}
                    href={`/admin/lazsip/donasi/${campaign.id}`}
                    className="block rounded-xl transition-colors hover:bg-lazsip-primary-50/50"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 truncate font-medium text-lazsip-primary-900">
                        <span className="text-xs font-bold text-lazsip-primary-400">#{i + 1}</span>
                        {campaign.title}
                      </span>
                      <span className="shrink-0 text-xs text-lazsip-primary-800/50">{percentage}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-lazsip-primary-100">
                      <div className="h-full rounded-full bg-lazsip-primary-700" style={{ width: `${percentage}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-lazsip-primary-800/45">{formatRupiah(campaign.currentAmount)}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-lazsip-primary-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-lazsip-primary-900">Transaksi Terbaru</h2>
          <Link href="/admin/lazsip/transaksi" className="text-xs font-semibold text-lazsip-primary-700 hover:underline">
            Lihat Semua →
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-sm text-lazsip-primary-800/50">Belum ada transaksi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/60">
                  <th className="py-2.5 font-semibold">Transaksi</th>
                  <th className="py-2.5 font-semibold">Donatur</th>
                  <th className="py-2.5 font-semibold">Nominal</th>
                  <th className="py-2.5 font-semibold">Waktu</th>
                  <th className="py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-2.5 font-medium text-lazsip-primary-900">{tx.label}</td>
                    <td className="py-2.5 text-lazsip-primary-800/60">{tx.donorName}</td>
                    <td className="py-2.5 text-lazsip-primary-800/60">{formatRupiah(tx.amount)}</td>
                    <td className="py-2.5 text-lazsip-primary-800/45">{formatDateTime(tx.createdAt)}</td>
                    <td className="py-2.5">
                      <AdminBadge tone={STATUS_TONE[tx.status]}>{STATUS_LABEL[tx.status]}</AdminBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
