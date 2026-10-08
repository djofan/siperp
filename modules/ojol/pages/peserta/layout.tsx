import { requireOjolMember } from "@/modules/ojol/api/access";
import { AppShell } from "@/modules/ojol/components/app/AppShell";
import { photoUrl } from "@/modules/ojol/components/app/media";

export const metadata = { title: "Peserta", robots: { index: false, follow: false } };

export default async function PesertaLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireOjolMember("peserta");
  return (
    <AppShell
      root="/ojol/peserta"
      roleLabel="Peserta · Driver"
      user={{ name: viewer.name, code: viewer.member.code, photo: photoUrl(viewer.member) }}
      nav={[
        { href: "/ojol/peserta", label: "Beranda", icon: "home" },
        { href: "/ojol/peserta/tugas", label: "Tugas", icon: "tasks" },
        { href: "/ojol/peserta/profil", label: "Profil", icon: "user" },
      ]}
    >
      {children}
    </AppShell>
  );
}
