import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { DirectorySummary } from "@/modules/ojol/components/admin/DirectorySummary";
import { panelClasses } from "@/components/ui/panel";
import { requireOjolAdmin } from "@/modules/ojol/api/access";
import { adminSummary, mapPoints, recentMembers } from "@/modules/ojol/api/dashboard";
import { SpreadMap } from "@/modules/ojol/components/admin/SpreadMap";
import { Avatar, formatDate } from "@/modules/ojol/components/ui";

export default async function OjolAdminDashboard() {
  await requireOjolAdmin();
  const [summary, points, recent] = await Promise.all([adminSummary(), mapPoints(), recentMembers()]);

  return (
    <div className="ojol-reference-dashboard space-y-6">
      <PageHeader
        title="Ojol Mengaji"
        description="Setoran hafalan driver ojek online. Kelola guru, peserta, dan kelompok; pantau tugas dan setoran."
      />

      <div className="ojol-dashboard-primary">
      <DirectorySummary items={[
        { label: "Guru", value: summary.guru, detail: "Pembimbing dan musyrif", icon: "user" },
        { label: "Peserta", value: summary.peserta, detail: "Driver terdaftar", icon: "students" },
        { label: "Kelompok", value: summary.groups, detail: "Wilayah dan basecamp", icon: "map" },
        { label: "Total tugas", value: summary.tasks, detail: "Tugas dari seluruh guru", icon: "tasks" },
      ]} />
      <div className="ojol-dashboard-grid grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="ojol-dashboard-shortcuts">
          <h2>Pengelolaan program</h2>
          <p className="ojol-shortcut-caption">Ojol Mengaji</p>
          <div className="ojol-shortcut-links">
            <Link href="/admin/ojol/guru"><span>Guru</span><strong>{summary.guru}</strong><small>Pembimbing dan musyrif ↗</small></Link>
            <Link href="/admin/ojol/peserta"><span>Peserta</span><strong>{summary.peserta}</strong><small>Driver terdaftar ↗</small></Link>
            <Link href="/admin/ojol/kelompok"><span>Kelompok</span><strong>{summary.groups}</strong><small>Wilayah dan basecamp ↗</small></Link>
          </div>
        </section>
        <section className={panelClasses("ojol-map-panel p-5")}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-foreground">Sebaran guru & peserta</h2>
            <p className="text-xs text-foreground/50">{points.length} lokasi dari alamat kelurahan</p>
          </div>
          {points.length ? (
            <SpreadMap points={points} />
          ) : (
            <p className="rounded-xl bg-surface-muted px-4 py-12 text-center text-sm text-foreground/60">
              Belum ada lokasi. Lokasi terisi otomatis setelah alamat (sampai kelurahan) guru atau peserta disimpan.
            </p>
          )}
        </section>

      </div>
      </div>
        <div className="ojol-dashboard-rail space-y-4">
        <section className="ojol-review-panel">
          <p className="text-sm font-medium">Setoran menunggu review</p>
          <p className="ojol-review-value">{summary.pending}</p>
          <Link href="/admin/ojol/tugas?filter=menunggu" className="ojol-review-link">Buka monitor tugas ↗</Link>
        </section>
        <section className={panelClasses("ojol-recent-panel p-5")}>
          <h2 className="mb-4 font-semibold text-foreground">Akun terbaru</h2>
          {recent.length ? (
            <ul className="space-y-3">
              {recent.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 text-sm">
                  <Avatar name={member.user.name} size={32} />
                  <Link href={`/admin/ojol/${member.role}/${member.id}`} className="min-w-0 hover:underline">
                    <span className="block truncate font-medium text-foreground">{member.user.name}</span>
                    <span className="text-xs text-foreground/50">
                      {member.code} · {member.role === "guru" ? "Guru" : "Peserta"}
                    </span>
                  </Link>
                  <span className="shrink-0 text-xs text-foreground/40">{formatDate(member.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/60">Belum ada akun.</p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/admin/ojol/guru/baru" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              + Guru
            </Link>
            <Link href="/admin/ojol/peserta/baru" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              + Peserta
            </Link>
          </div>
        </section>
        </div>
    </div>
  );
}
