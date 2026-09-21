import { notFound } from "next/navigation";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { AdminBadge } from "@/modules/lazsip/components/admin/AdminBadge";
import { getDonorSummaryById } from "@/modules/lazsip/api/donors";
import { getDonorTransactionHistory } from "@/modules/lazsip/api/transactionHistory";
import { panelClasses } from "@/components/ui/panel";

const formatRupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;
const formatDateTime = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);

const STATUS_LABEL: Record<string, string> = { pending: "Menunggu", paid: "Lunas", failed: "Gagal" };
const STATUS_TONE: Record<string, "neutral" | "secondary" | "danger"> = { pending: "neutral", paid: "secondary", failed: "danger" };

export default async function DonorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [donor, history] = await Promise.all([getDonorSummaryById(id), getDonorTransactionHistory(id)]);

  if (!donor) {
    notFound();
  }

  return (
    <div>
      <BackLink href="/admin/lazsip/donatur">Semua Donatur</BackLink>

      <div className="mb-6 mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">{donor.name}</h2>
            {donor.types.map((type) => (
              <AdminBadge key={type} tone={type === "zakat" ? "primary" : "secondary"}>
                {type === "zakat" ? "Muzakki" : "Donatur"}
              </AdminBadge>
            ))}
          </div>
          <p className="mt-1 text-sm text-lazsip-primary-800/60 dark:text-white/55">
            {donor.phone ? `+${donor.phone}` : "WA belum tercatat"} &middot; {donor.email ?? "Email belum tercatat"}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={panelClasses("p-5")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-lazsip-primary-800/50 dark:text-white/40">Total Kontribusi Lunas</p>
          <p className="mt-1.5 text-2xl font-extrabold text-lazsip-primary-900 dark:text-white">{formatRupiah(donor.totalContribution)}</p>
        </div>
        <div className={panelClasses("p-5")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-lazsip-primary-800/50 dark:text-white/40">Jumlah Transaksi</p>
          <p className="mt-1.5 text-2xl font-extrabold text-lazsip-primary-900 dark:text-white">{donor.contributionCount}x</p>
        </div>
        <div className={panelClasses("p-5")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-lazsip-primary-800/50 dark:text-white/40">Transaksi Terakhir</p>
          <p className="mt-1.5 text-2xl font-extrabold text-lazsip-primary-900 dark:text-white">{formatDateTime(donor.lastContributionAt)}</p>
        </div>
      </div>

      <h3 className="mb-3 text-sm font-semibold text-lazsip-primary-900 dark:text-white">Riwayat Transaksi Lengkap</h3>
      {history.length === 0 ? (
        <p className="text-sm text-lazsip-primary-800/60 dark:text-white/55">Belum ada riwayat transaksi.</p>
      ) : (
        <div className={panelClasses("overflow-hidden")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-lazsip-primary-100 dark:border-white/10 bg-lazsip-primary-50/60 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-lazsip-primary-700/70 dark:text-white/55">
                  <th className="px-4 py-3.5 font-semibold">Kode</th>
                  <th className="px-4 py-3.5 font-semibold">Jenis</th>
                  <th className="px-4 py-3.5 font-semibold">Nominal</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lazsip-primary-50 dark:divide-white/10">
                {history.map((item) => (
                  <tr key={item.trackingCode} className="transition-colors hover:bg-lazsip-primary-50/40 dark:hover:bg-white/5">
                    <td className="px-4 py-3.5 font-mono text-xs text-lazsip-primary-800/70 dark:text-white/60">{item.trackingCode}</td>
                    <td className="px-4 py-3.5 text-lazsip-primary-900 dark:text-white">{item.type === "donasi" ? "Donasi" : "Zakat"} — {item.label}</td>
                    <td className="px-4 py-3.5 font-medium text-lazsip-primary-900 dark:text-white">{formatRupiah(item.amount)}</td>
                    <td className="px-4 py-3.5">
                      <AdminBadge tone={STATUS_TONE[item.status] ?? "neutral"}>{STATUS_LABEL[item.status] ?? item.status}</AdminBadge>
                    </td>
                    <td className="px-4 py-3.5 text-lazsip-primary-800/60 dark:text-white/55">{formatDateTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
