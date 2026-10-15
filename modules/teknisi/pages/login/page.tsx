import { redirect } from "next/navigation";
import { ParticipantLoginForm } from "@/components/auth/ParticipantLoginForm";
import { getTeknisiParticipant } from "../../api/participant-access";
import { getTechnicianUser } from "../../api/access";
export default async function Page() {
  if ((await getTechnicianUser())?.role === "technician") redirect("/teknisi/panel");
  if (await getTeknisiParticipant()) redirect("/teknisi/peserta");
  return <section className="mx-auto max-w-md px-6 py-16"><h1 className="text-3xl font-bold">Masuk Teknisi HP</h1><p className="mb-8 mt-3 text-sm leading-6 text-slate-600">Gunakan NIP PTH dan password yang diberikan setelah pendaftaran di panel Teknisi.</p><ParticipantLoginForm moduleSlug="teknisi" successHref="/teknisi/panel" /><p className="mt-6 text-sm text-slate-500">Belum memiliki akun? Hubungi admin untuk pendaftaran akun outlet.</p></section>;
}
