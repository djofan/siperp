import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { SipDashboardStatCard } from "@/modules/sip/components/admin/SipDashboardStatCard";
import { getDashboardCounts, getRecentPenyaluranBantuan } from "@/modules/sip/api/dashboard";
import { panelClasses } from "@/components/ui/panel";

const formatDate = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);

export default async function SipDashboardPage() {
  const [counts, recentPenyaluran] = await Promise.all([getDashboardCounts(), getRecentPenyaluranBantuan(5)]);

  return (
    <div className="flex flex-col gap-6">
      <SipAdminPageHeader title="Dashboard" description="Ringkasan konten portal SIP — company profile & CMS yayasan." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SipDashboardStatCard icon="program" label="Program Bantuan" value={String(counts.programCount)} />
        <SipDashboardStatCard icon="penyaluran" label="Penyaluran Bantuan" value={String(counts.penyaluranCount)} />
        <SipDashboardStatCard icon="berita" label="Berita Published" value={String(counts.publishedNewsCount)} />
        <SipDashboardStatCard icon="laporan" label="Laporan" value={String(counts.laporanCount)} />
      </div>

      <div className={panelClasses("p-6")}>
        <h2 className="mb-4 text-sm font-semibold text-sip-primary-900 dark:text-white">Penyaluran Bantuan Terbaru</h2>
        {recentPenyaluran.length === 0 ? (
          <p className="text-sm text-sip-primary-800/50 dark:text-white/45">Belum ada data penyaluran bantuan.</p>
        ) : (
          <div className="flex flex-col divide-y divide-sip-primary-100 dark:divide-white/10">
            {recentPenyaluran.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-sip-primary-900 dark:text-white">{item.title}</span>
                <span className="text-sip-primary-800/50 dark:text-white/45">{formatDate(item.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
