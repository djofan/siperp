import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { DirectorySummary } from "@/modules/tanwir/components/admin/DirectorySummary";
import { panelClasses } from "@/components/ui/panel";
import { buttonVariants } from "@/components/ui/Button";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { adminSummary, mapPoints, recentMembers } from "@/modules/tanwir/api/dashboard";
import { SpreadMap } from "@/modules/tanwir/components/admin/SpreadMap";
import { formatDate } from "@/modules/tanwir/components/ui";

export default async function TanwirAdminDashboard() {
  await requireTanwirAdmin();
  const [summary, points, recent] = await Promise.all([adminSummary(), mapPoints(), recentMembers()]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tanwir Qurani"
        description="Pembinaan hafalan guru ngaji TPQ. Kelola guru, peserta, dan kelompok; pantau tugas dan setoran."
        actions={
          <Link href="/tanwir" target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary" })}>
            Lihat situs ↗
          </Link>
        }
      />

      <DirectorySummary items={[
        { label: "Guru", value: summary.guru, detail: "Guru pembimbing terdaftar", icon: "user" },
        { label: "Peserta", value: summary.peserta, detail: "Guru ngaji terdaftar", icon: "students" },
        { label: "Anak didik", value: summary.students, detail: "Santri dalam pembinaan", icon: "students" },
        { label: "Total tugas", value: summary.tasks, detail: "Tugas dari seluruh guru", icon: "tasks" },
      ]} />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-tanwir-muted">
        <Link href="/admin/tanwir/kelompok" className="hover:text-tanwir-primary">{summary.groups} kelompok pembinaan</Link>
        <Link href="/admin/tanwir/tugas" className="hover:text-tanwir-primary">{summary.pending} setoran menunggu review</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className={panelClasses("p-4")}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-foreground">Sebaran guru & peserta</h2>
            <p className="text-xs text-foreground/50">{points.length} lokasi dari alamat kelurahan</p>
          </div>
          {points.length ? (
            <SpreadMap points={points} />
          ) : (
            <p className="rounded-lg bg-surface-muted px-4 py-6 text-center text-sm text-foreground/60">
              Belum ada lokasi. Lokasi terisi otomatis setelah alamat (sampai kelurahan) guru atau peserta disimpan.
            </p>
          )}
        </section>

        <section className={panelClasses("p-4")}>
          <h2 className="mb-4 font-semibold text-foreground">Akun terbaru</h2>
          {recent.length ? (
            <ul className="space-y-3">
              {recent.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/tanwir/${member.role}/${member.id}`} className="min-w-0 hover:underline">
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
            <Link href="/admin/tanwir/guru/baru" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              + Guru
            </Link>
            <Link href="/admin/tanwir/peserta/baru" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              + Peserta
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
