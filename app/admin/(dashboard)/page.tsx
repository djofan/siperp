import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listAccessibleModules, countActiveModules } from "@/modules/core/modules";
import { countUsers } from "@/modules/core/users";
import { getModuleBadgeColor } from "@/components/admin-shell/moduleColors";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { LayersIcon, UsersIcon, ShieldIcon, ArrowRightIcon, UserCircleIcon, GridIcon } from "@/components/ui/icons";
import { panelClasses } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

const TODAY_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const SUPER_LINKS = [
  {
    href: "/admin/super",
    title: "Overview",
    description: "Ringkasan akun, modul, dan aktivitas terbaru.",
    icon: GridIcon,
  },
  {
    href: "/admin/super/akun",
    title: "Kelola Akun",
    description: "Tambah akun dan atur akses modul per orang.",
    icon: UserCircleIcon,
  },
  {
    href: "/admin/super/modul",
    title: "Modul Terdaftar",
    description: "Lihat dan kelola status setiap modul platform.",
    icon: ShieldIcon,
  },
];

export default async function DashboardHomePage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [accessibleModules, totalUsers, totalActiveModules] = await Promise.all([
    listAccessibleModules(session),
    session.isSuperadmin ? countUsers() : Promise.resolve(null),
    session.isSuperadmin ? countActiveModules() : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Selamat datang, ${session.name}.`}
        description="Pilih modul di bawah untuk mulai bekerja, atau kelola akun & akses lewat menu Superadmin."
        actions={
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground/55">
            {TODAY_FORMATTER.format(new Date())}
          </span>
        }
      />

      <div className="flex flex-wrap gap-4">
        <StatCard
          className="min-w-[220px] flex-1"
          icon={<LayersIcon className="h-5 w-5" />}
          label="Modul dapat diakses"
          value={accessibleModules.length}
        />
        {session.isSuperadmin && (
          <>
            <StatCard
              className="min-w-[220px] flex-1"
              icon={<UsersIcon className="h-5 w-5" />}
              label="Total akun terdaftar"
              value={totalUsers ?? 0}
            />
            <StatCard
              className="min-w-[220px] flex-1"
              icon={<ShieldIcon className="h-5 w-5" />}
              label="Modul aktif platform"
              value={totalActiveModules ?? 0}
            />
          </>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground/70">Modul Anda</h2>
        {accessibleModules.length === 0 ? (
          <EmptyState className="px-8 py-12">
            Belum ada modul yang bisa diakses. Hubungi superadmin untuk otorisasi.
          </EmptyState>
        ) : (
          <div className="flex flex-wrap gap-4">
            {accessibleModules.map((module) => {
              const color = getModuleBadgeColor(module.slug);
              return (
                <Link
                  key={module.id}
                  href={`/admin/${module.slug}`}
                  className={panelClasses(
                    "group flex min-w-[260px] flex-1 flex-col justify-between p-5 transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.09)]"
                  )}
                >
                  <div>
                    <span className={cn("inline-flex h-2.5 w-2.5 rounded-full", color.dot)} />
                    <p className="mt-3 text-base font-semibold text-foreground">{module.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground/50">
                      {module.description || "Belum ada deskripsi modul."}
                    </p>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                    Buka modul
                    <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {session.isSuperadmin && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground/70">Kelola Platform</h2>
          <div className="flex flex-wrap gap-4">
            {SUPER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={panelClasses(
                  "group flex min-w-[220px] flex-1 flex-col justify-between p-5 transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.09)]"
                )}
              >
                <div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <link.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-base font-semibold text-foreground">{link.title}</p>
                  <p className="mt-1 text-sm text-foreground/50">{link.description}</p>
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                  Buka
                  <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
