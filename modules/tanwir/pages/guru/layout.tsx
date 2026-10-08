import { prisma } from "@/lib/prisma";
import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { AppShell } from "@/modules/tanwir/components/app/AppShell";
import { photoUrl } from "@/modules/tanwir/components/app/media";

export const metadata = { title: "Guru", robots: { index: false, follow: false } };

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireTanwirMember("guru");
  const pending = await prisma.tanwirSubmission.count({
    where: { status: "pending", task: { teacherId: viewer.member.id, type: { not: "quiz" } } },
  });
  return (
    <AppShell
      root="/tanwir/guru"
      roleLabel="Guru · PIC kelompok"
      user={{ name: viewer.name, code: viewer.member.code, photo: photoUrl(viewer.member) }}
      nav={[
        { href: "/tanwir/guru", label: "Beranda", icon: "home" },
        { href: "/tanwir/guru/koreksi", label: "Koreksi", icon: "review", badge: pending },
        { href: "/tanwir/guru/tugas", label: "Tugas", icon: "tasks" },
        { href: "/tanwir/guru/anak-didik", label: "Anak Didik", icon: "students" },
        { href: "/tanwir/guru/profil", label: "Profil", icon: "user" },
      ]}
    >
      {children}
    </AppShell>
  );
}
