import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listAccessibleModules, listModules } from "@/modules/core/modules";
import { getModuleBadgeColor } from "@/components/admin-shell/moduleColors";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArrowRightIcon, LayersIcon } from "@/components/ui/icons";
import { panelClasses } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export const metadata = { title: "Modul · SIP Core" };

export default async function ModuleLauncherPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  // Preserve the existing visibility policy: superadmins can also test inactive modules.
  const modules = session.isSuperadmin ? await listModules() : await listAccessibleModules(session);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Modul" description="Pilih ruang kerja yang ingin Anda buka. Modul ditampilkan sesuai akses akun Anda."
        actions={<span className="rounded-full bg-white/5 px-4 py-2 text-xs text-foreground/60">{modules.length} modul tersedia</span>} />
      {modules.length === 0 ? (
        <EmptyState className="px-6 py-14">Belum ada modul yang dapat diakses. Hubungi superadmin untuk mengatur akses akun Anda.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const color = getModuleBadgeColor(module.slug);
            return (
              <Link key={module.id} href={`/admin/${module.slug}`} aria-label={`Buka modul ${module.name}${module.isActive ? "" : " (nonaktif)"}`}
                className={panelClasses("group flex min-h-52 flex-col gap-5 rounded-3xl p-6 transition-colors hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent")}>
                <div className="flex items-center justify-between gap-3">
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-foreground/70">
                    <LayersIcon className="h-5 w-5" />
                    <span className={cn("absolute bottom-1 right-1 h-2 w-2 rounded-full", color.dot)} />
                  </span>
                  <span className={cn("rounded-full px-3 py-1 text-[10px] font-medium", module.isActive ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300")}>
                    {module.isActive ? "Aktif" : "Nonaktif · akses superadmin"}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-foreground">{module.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/50">{module.description || "Buka ruang kerja untuk mengelola modul ini."}</p>
                </div>
                <span className="flex items-center justify-between text-xs font-medium text-accent">Buka modul <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
