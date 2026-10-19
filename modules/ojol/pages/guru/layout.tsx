import { teacherSummary } from "@/modules/ojol/api/dashboard";
import { requireOjolMember } from "@/modules/ojol/api/access";
import { AppShell } from "@/modules/ojol/components/app/AppShell";
import { photoUrl } from "@/modules/ojol/components/app/media";

export const metadata = { title: "Guru", robots: { index: false, follow: false } };

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireOjolMember("guru");
  const pending = (await teacherSummary(viewer.member.id)).pending;
  return (
    <AppShell
      root="/ojol/guru"
      roleLabel="Guru pembimbing"
      user={{ name: viewer.name, code: viewer.member.code, photo: photoUrl(viewer.member) }}
      nav={[
        { href: "/ojol/guru", label: "Beranda", icon: "home" },
        { href: "/ojol/guru/koreksi", label: "Koreksi", icon: "review", badge: pending },
        { href: "/ojol/guru/tugas", label: "Tugas", icon: "tasks" },
        { href: "/ojol/guru/profil", label: "Profil", icon: "user" },
      ]}
    >
      {children}
    </AppShell>
  );
}
