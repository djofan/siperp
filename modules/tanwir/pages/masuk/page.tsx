import { redirect } from "next/navigation";
import { ProgramLoginShell } from "@/components/auth/ProgramLoginShell";
import { getTanwirViewer, homePathFor } from "@/modules/tanwir/api/access";
import { LoginForm } from "@/modules/tanwir/components/site/LoginForm";
import { whatsappAdminHref } from "@/modules/tanwir/components/site/content";

export const metadata = { title: "Masuk" };

export default async function TanwirLoginPage() {
  const viewer = await getTanwirViewer();
  if (viewer?.member) redirect(homePathFor(viewer));
  return <ProgramLoginShell name="Tanwir Qurani" href="/tanwir" tone="light"
    heading="Satu ruang untuk belajar dan bertumbuh."
    description="Pembinaan hafalan Al-Qur’an untuk guru ngaji TPQ, terhubung bersama guru dan kelompok belajar."
    features={[
      { title: "Tugas dan setoran", description: "Lihat penugasan kelompok dan kumpulkan setoran dari satu dashboard." },
      { title: "Bimbingan guru", description: "Terima penilaian dan catatan untuk memperbaiki bacaan." },
      { title: "Anak didik", description: "Catat santri dan perkembangan belajar di TPQ." },
    ]}
    helpHref={whatsappAdminHref("Assalamu'alaikum, saya butuh bantuan akun Tanwir Qurani.")}>
    <LoginForm />
  </ProgramLoginShell>;
}
