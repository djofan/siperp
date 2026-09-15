import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { SipDashboardStatCard } from "@/modules/sip/components/admin/SipDashboardStatCard";
import { getDashboardCounts, getRecentKegiatan } from "@/modules/sip/api/dashboard";

const formatDate = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);

export default async function SipDashboardPage() {
  const [counts, recentKegiatan] = await Promise.all([getDashboardCounts(), getRecentKegiatan(5)]);

  return (
    <div className="flex flex-col gap-6">
      <SipAdminPageHeader title="Dashboard" description="Ringkasan konten portal SIP — company profile & CMS yayasan." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SipDashboardStatCard icon="pengurus" label="Pengurus" value={String(counts.pengurusCount)} />
        <SipDashboardStatCard icon="program" label="Program Bantuan" value={String(counts.programCount)} />
        <SipDashboardStatCard icon="blog" label="Artikel Published" value={String(counts.publishedBlogCount)} />
        <SipDashboardStatCard icon="kegiatan" label="Kegiatan Terkini" value={String(counts.kegiatanCount)} />
        <SipDashboardStatCard icon="mitra" label="Mitra" value={String(counts.mitraCount)} />
        <SipDashboardStatCard icon="laporan" label="Laporan" value={String(counts.laporanCount)} />
      </div>

      <div className="rounded-2xl border border-sip-primary-100 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-sip-primary-900">Kegiatan Terkini Terbaru</h2>
        {recentKegiatan.length === 0 ? (
          <p className="text-sm text-sip-primary-800/50">Belum ada kegiatan.</p>
        ) : (
          <div className="flex flex-col divide-y divide-sip-primary-100">
            {recentKegiatan.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-sip-primary-900">{item.title}</span>
                <span className="text-sip-primary-800/50">{formatDate(item.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
