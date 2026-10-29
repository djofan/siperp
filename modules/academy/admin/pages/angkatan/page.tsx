import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyCohort } from "@/modules/academy/api/page-contracts";
import { requireAcademyAdmin } from "../../../api/admin-access";
import { createCohort, setCohortRegistration } from "../../../api/cohort-actions";
import { ActionForm } from "../../../components/ActionForm";
import { redirect } from "next/navigation";
import { inputClass } from "../../../components/ui";
export async function CohortsPanel() {
  await requireAcademyAdmin();
  const cohorts = await academyPage<AcademyCohort[]>("academy/admin/cohorts");
  return <>
    <details className="mb-6 rounded-2xl border border-gray-100 bg-white p-5"><summary className="cursor-pointer font-semibold">Buat angkatan baru</summary><ActionForm className="mt-5 max-w-xl" action={createCohort} label="Buat angkatan"><label>Nama angkatan<input name="title" required minLength={3} maxLength={191} className={inputClass} placeholder="Insan Academy — Angkatan 2" /></label><p className="text-sm text-gray-500">Jumlah peserta tidak dibatasi. Materi dapat dibuat langsung atau diduplikasi dari angkatan lain.</p></ActionForm></details>
    <div className="space-y-4">{cohorts.map(cohort => <article key={cohort.id} className="rounded-2xl border border-gray-100 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{cohort.title}</h2><span className={`rounded-full px-3 py-1 text-xs ${cohort.registrationOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{cohort.registrationOpen ? "Pendaftaran dibuka" : "Pendaftaran ditutup"}</span></div><p className="mt-3 text-sm text-gray-500">{cohort.participants_count} peserta</p><div className="mt-4 flex flex-wrap items-center gap-4"><ActionForm action={setCohortRegistration.bind(null, cohort.id, !cohort.registrationOpen)} label={cohort.registrationOpen ? "Tutup Pendaftaran" : "Buka Pendaftaran"} /></div></article>)}{!cohorts.length && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-gray-500">Belum ada angkatan. Buat angkatan untuk mendaftarkan peserta.</p>}</div>
  </>;
}

export default async function CohortsPage() { await requireAcademyAdmin(); redirect("/admin/academy/peserta?tab=angkatan"); }
