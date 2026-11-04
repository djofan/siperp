import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { accountPanelRedirect } from "@/modules/core/modules";
import { type NavGroup } from "@/components/admin-shell/Sidebar";
import { CoreChrome } from "@/components/admin-shell/CoreChrome";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  const destination = await accountPanelRedirect(session);
  if (destination) redirect(destination);

  const groups: NavGroup[] = [
    { items: [{ href: "/admin", label: "Dashboard" }, { href: "/admin/modul", label: "Modul" }] },
  ];

  if (session.isSuperadmin) {
    groups.push({
      heading: "Superadmin",
      items: [
        { href: "/admin/super", label: "Overview" },
        { href: "/admin/super/kontak", label: "Kontak Terpadu" },
        { href: "/admin/super/keuangan", label: "Keuangan & Rekonsiliasi" },
        { href: "/admin/super/backup", label: "Backup & Pemulihan" },
        { href: "/admin/super/akun", label: "Akun admin modul" },
        { href: "/admin/super/modul", label: "Modul Terdaftar" },
        { href: "/admin/super/rekening-payment", label: "Rekening Pembayaran" },
      ],
    });
  }
  if (session.isSuperadmin || Object.values(session.moduleRoles ?? {}).includes('admin')) {
    groups.push({heading: 'Pengelolaan', items: [{href: '/admin/akun-modul', label: 'Akun operasional'}]});
  }

  return (
    <CoreChrome groups={groups} userName={session.name} isSuperadmin={session.isSuperadmin}>
      {children}
    </CoreChrome>
  );
}
