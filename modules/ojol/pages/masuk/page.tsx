import { redirect } from "next/navigation";
import { ProgramLoginShell } from "@/components/auth/ProgramLoginShell";
import { getOjolViewer, homePathFor } from "@/modules/ojol/api/access";
import { LoginForm } from "@/modules/ojol/components/site/LoginForm";
import { whatsappAdminHref } from "@/modules/ojol/components/site/content";

export const metadata = { title: "Masuk" };

export default async function OjolLoginPage() {
  const viewer = await getOjolViewer();
  if (viewer?.member) redirect(homePathFor(viewer));
  return <ProgramLoginShell name="Ojol Mengaji" href="/ojol" tone="green"
    heading="Jeda dari jalan, dekat dengan Al-Qur’an."
    description="Ruang belajar untuk pengemudi ojek online. Lanjutkan mengaji bersama guru pembimbing di sela aktivitas."
    features={[
      { title: "Setoran bacaan", description: "Kumpulkan rekaman audio atau video sesuai tugas dari guru." },
      { title: "Arahan pembimbing", description: "Lihat hasil review dan catatan bacaan di dashboard." },
      { title: "Kelompok belajar", description: "Tetap terhubung dengan guru dan penugasan kelompokmu." },
    ]}
    helpHref={whatsappAdminHref("Assalamu'alaikum, saya butuh bantuan akun Ojol Mengaji.")}>
    <LoginForm />
  </ProgramLoginShell>;
}
