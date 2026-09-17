import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listAccessibleModules } from "@/modules/core/modules";
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

  const accessibleModules = await listAccessibleModules(session);

  const groups: NavGroup[] = [
    { items: [{ href: "/admin", label: "Dashboard" }] },
  ];

  if (accessibleModules.length > 0) {
    groups.push({
      heading: "Modul",
      collapsible: true,
      items: accessibleModules.map((module) => ({
        href: `/admin/${module.slug}`,
        label: module.name,
      })),
    });
  }

  if (session.isSuperadmin) {
    groups.push({
      heading: "Superadmin",
      items: [
        { href: "/admin/super", label: "Overview" },
        { href: "/admin/super/akun", label: "Kelola Akun" },
        { href: "/admin/super/modul", label: "Modul Terdaftar" },
      ],
    });
  }

  return (
    <AdminShellChrome groups={groups} userName={session.name}>
      {children}
    </AdminShellChrome>
  );
}
