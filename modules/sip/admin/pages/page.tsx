import Link from "next/link";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { SipDashboardStatCard } from "@/modules/sip/components/admin/SipDashboardStatCard";
import { SipPenyaluranYearChart } from "@/modules/sip/components/admin/SipPenyaluranYearChart";
import { SipLaporanCoverage } from "@/modules/sip/components/admin/SipLaporanCoverage";
import {
  getContentSummary,
  getDashboardCounts,
  getLaporanCoverage,
  getPenyaluranPerYear,
  getRecentPenyaluranBantuan,
} from "@/modules/sip/api/dashboard";
import { panelClasses } from "@/components/ui/panel";

const formatDate = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(date);

export default async function SipDashboardPage() {
  const [counts, recentPenyaluran, perYear, coverage, summary] = await Promise.all([
    getDashboardCounts(),
    getRecentPenyaluranBantuan(5),
    getPenyaluranPerYear(),
    getLaporanCoverage(),
    getContentSummary(),
  ]);

  const quickActions = [
    { href: "/admin/sip/penyaluran-bantuan/baru", label: "Tambah penyaluran" },
    { href: "/admin/sip/berita/baru", label: "Tulis berita" },
    { href: "/admin/sip/laporan/baru", label: "Unggah laporan" },
    { href: "/admin/sip/program-bantuan/baru", label: "Tambah program" },
  ];

  const beranda = [
    { label: "Program bantuan", value: summary.programPinned, total: counts.programCount, href: "/admin/sip/program-bantuan" },
    { label: "Berita", value: summary.newsPinned, total: counts.publishedNewsCount, href: "/admin/sip/berita" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SipAdminPageHeader title="Dashboard" description="Ringkasan konten portal SIP — company profile & CMS yayasan." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SipDashboardStatCard
          icon="program"
          label="Program Bantuan"
          value={String(counts.programCount)}
          hint={`${summary.programPinned} tampil di beranda`}
        />
        <SipDashboardStatCard
          icon="penyaluran"
          label="Penyaluran Bantuan"
          value={String(counts.penyaluranCount)}
          hint={summary.lastPenyaluranDate ? `Terakhir ${formatDate(summary.lastPenyaluranDate)}` : "Belum ada data"}
        />
        <SipDashboardStatCard
          icon="berita"
          label="Berita Published"
          value={String(counts.publishedNewsCount)}
          hint={summary.newsDraft ? `${summary.newsDraft} masih draft` : "Tidak ada draft"}
        />
        <SipDashboardStatCard
          icon="laporan"
          label="Laporan"
          value={String(counts.laporanCount)}
          hint={`${counts.laporanCount - summary.laporanTahunan} bulanan · ${summary.laporanTahunan} tahunan`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <SipPenyaluranYearChart data={perYear} />
        <SipLaporanCoverage {...coverage} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className={panelClasses("p-6")}>
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Penyaluran Bantuan Terbaru</h2>
            <Link href="/admin/sip/penyaluran-bantuan" className="text-xs font-semibold text-sip-lime hover:text-sip-lime-hover">
              Lihat semua →
            </Link>
          </div>
          {recentPenyaluran.length === 0 ? (
            <p className="text-sm text-white/45">Belum ada data penyaluran bantuan.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {recentPenyaluran.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/sip/penyaluran-bantuan/${item.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl px-2.5 py-2.5 text-sm transition-colors hover:bg-white/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-white">{item.title}</span>
                    {item.location && <span className="block truncate text-xs text-white/45">{item.location}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-white/45">{formatDate(item.date)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className={panelClasses("p-6")}>
            <h2 className="text-sm font-semibold text-white">Tampil di beranda</h2>
            <p className="mt-1 text-xs text-white/45">Konten yang di-pin muncul di halaman utama portal.</p>
            <div className="mt-4 flex flex-col gap-4">
              {beranda.map((row) => (
                <Link key={row.label} href={row.href} className="group flex flex-col gap-1.5">
                  <span className="flex items-baseline justify-between text-sm">
                    <span className="text-white/75 group-hover:text-white">{row.label}</span>
                    <span className="text-xs text-white/45">
                      <strong className="text-white">{row.value}</strong> dari {row.total}
                    </span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-sip-lime"
                      style={{ width: `${row.total ? (row.value / row.total) * 100 : 0}%` }}
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className={panelClasses("p-6")}>
            <h2 className="text-sm font-semibold text-white">Aksi cepat</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-xl bg-white/[0.05] px-3 py-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-sip-lime hover:text-sip-ink"
                >
                  + {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
