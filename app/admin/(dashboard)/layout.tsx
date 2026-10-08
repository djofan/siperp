import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listAccessibleModules, listModules } from "@/modules/core/modules";
import { type NavGroup } from "@/components/admin-shell/Sidebar";
import { AdminShellChrome } from "@/components/admin-shell/AdminShellChrome";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  // Superadmin juga melihat modul nonaktif (ditandai) supaya modul yang masih dikembangkan
  // tetap bisa dibuka & dites dari sidebar; admin biasa hanya melihat modul aktif yang diizinkan.
  const accessibleModules = session.isSuperadmin ? await listModules() : await listAccessibleModules(session);

  const groups: NavGroup[] = [
    { items: [{ href: "/admin", label: "Dashboard" }] },
  ];

  if (accessibleModules.length > 0) {
    groups.push({
      heading: "Modul",
      collapsible: true,
      items: accessibleModules.map((module) => ({
        href: `/admin/${module.slug}`,
        label: module.isActive ? module.name : `${module.name} (nonaktif)`,
      })),
    });
  }

  if (session.isSuperadmin) {
    groups.push({
      heading: "Superadmin",
      items: [
        { href: "/admin/super", label: "Overview" },
        { href: "/admin/super/kontak", label: "Kontak Terpadu" },
        { href: "/admin/super/keuangan", label: "Keuangan & Rekonsiliasi" },
        { href: "/admin/super/backup", label: "Backup & Pemulihan" },
        { href: "/admin/super/akun", label: "Kelola Akun" },
        { href: "/admin/super/modul", label: "Modul Terdaftar" },
        { href: "/admin/super/rekening-payment", label: "Rekening Pembayaran" },
      ],
    });
  }

  return (
    <AdminShellChrome groups={groups} userName={session.name}>
      {children}
    </AdminShellChrome>
  );
}
