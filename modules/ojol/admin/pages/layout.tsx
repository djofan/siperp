import { AdminShell } from "@/modules/ojol/components/admin/AdminShell";
import "@/modules/ojol/components/experience.css";
import "@/modules/ojol/components/admin/admin.css";
import { ojolDisplay } from "@/modules/ojol/components/fonts";
import { ModuleInactiveNotice } from "@/components/admin-shell/ModuleInactiveNotice";
import { prisma } from "@/lib/prisma";
import { requireOjolAdmin } from "@/modules/ojol/api/access";

export const metadata = { title: "Admin Ojol Mengaji", robots: { index: false, follow: false } };

export default async function OjolAdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireOjolAdmin();
  const registered = await prisma.module.findUnique({ where: { slug: "ojol" }, select: { isActive: true } });
  return <div className={`${ojolDisplay.variable} ojol-experience ojol-admin`}>
    <AdminShell userName={viewer.sessionName}
      nav={[
        { href: "/admin/ojol", label: "Dashboard", icon: "home" },
        { href: "/admin/ojol/guru", label: "Guru", icon: "user" },
        { href: "/admin/ojol/peserta", label: "Peserta", icon: "students" },
        { href: "/admin/ojol/kelompok", label: "Kelompok", icon: "map" },
        { href: "/admin/ojol/tugas", label: "Monitor Tugas", icon: "tasks" },
        { href: "/admin", label: "Kembali ke Core", icon: "arrowLeft" },
      ]}>
      {!registered?.isActive && <ModuleInactiveNotice />}
      {children}
    </AdminShell>
  </div>;
}
