import { AdminShell } from "@/modules/tanwir/components/admin/AdminShell";
import "@/modules/tanwir/components/experience.css";
import "@/modules/tanwir/components/admin/admin.css";
import { tanwirSerif } from "@/modules/tanwir/components/fonts";
import { ModuleInactiveNotice } from "@/components/admin-shell/ModuleInactiveNotice";
import { prisma } from "@/lib/prisma";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";

export const metadata = { title: "Admin Tanwir Qurani", robots: { index: false, follow: false } };

export default async function TanwirAdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireTanwirAdmin();
  const registered = await prisma.module.findUnique({ where: { slug: "tanwir" }, select: { isActive: true } });
  return <div className={`${tanwirSerif.variable} tanwir-experience tanwir-admin`}>
    <AdminShell userName={viewer.sessionName}
      nav={[
        { href: "/admin/tanwir", label: "Dashboard", icon: "home" },
        { href: "/admin/tanwir/guru", label: "Guru", icon: "user" },
        { href: "/admin/tanwir/peserta", label: "Peserta", icon: "students" },
        { href: "/admin/tanwir/kelompok", label: "Kelompok", icon: "map" },
        { href: "/admin/tanwir/tugas", label: "Monitor Tugas", icon: "tasks" },
        { href: "/admin/tanwir/anak-didik", label: "Anak Didik", icon: "students" },
        { href: "/admin", label: "Kembali ke Core", icon: "arrowLeft" },
      ]}>
      {!registered?.isActive && <ModuleInactiveNotice />}
      {children}
    </AdminShell>
  </div>;
}
