import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { AppShell } from "@/modules/tanwir/components/app/AppShell";
import { photoUrl } from "@/modules/tanwir/components/app/media";

export const metadata = { title: "Peserta", robots: { index: false, follow: false } };

export default async function PesertaLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireTanwirMember("peserta");
  return (
    <AppShell
      root="/tanwir/peserta"
      roleLabel="Peserta · Guru ngaji"
      user={{ name: viewer.name, code: viewer.member.code, photo: photoUrl(viewer.member) }}
      nav={[
        { href: "/tanwir/peserta", label: "Beranda", icon: "home" },
        { href: "/tanwir/peserta/tugas", label: "Tugas", icon: "tasks" },
        { href: "/tanwir/peserta/anak-didik", label: "Anak Didik", icon: "students" },
        { href: "/tanwir/peserta/profil", label: "Profil", icon: "user" },
      ]}
    >
      {children}
    </AppShell>
  );
}
