import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { getAdminSettings } from "@/modules/academy/api/admin-participants";
import { saveAcademyMaintenance } from "@/modules/academy/api/actions";
import { AdminHeading, SavedNotice } from "@/modules/academy/components/admin/AdminUi";
import { MaintenanceForm } from "@/modules/academy/components/admin/ParticipantForms";
import { getLearningSettings } from "@/modules/academy/api/learning";
import { saveLearningSettings } from "@/modules/academy/api/intake-actions";
import { ActionForm } from "@/modules/academy/components/ActionForm";
export default async function Page({ searchParams }: { searchParams: Promise<{ tersimpan?: string }> }) {
  await requireAcademyAdmin();
  const settings = await getAdminSettings();
  const learning = await getLearningSettings();
  return <><AdminHeading title="Pengaturan Academy" description="Atur akses peserta selama pemeliharaan." />
    <SavedNotice saved={(await searchParams).tersimpan === "1"} />
    <section className="space-y-5 rounded-2xl bg-surface p-6">
      <p className="text-sm text-foreground">{!settings.registered ? "Modul belum terdaftar di Core. Hubungi pengelola Core untuk mendaftarkan Academy." : settings.active ? "Modul aktif di Core." : "Modul nonaktif di Core. Pengelola Core perlu mengaktifkannya sebelum peserta dapat mengakses Academy."}</p>
      <MaintenanceForm action={saveAcademyMaintenance} initial={settings.maintenance} />
    </section>
    <section className="mt-6 rounded-2xl bg-white p-6"><h2 className="mb-4 font-semibold">CS & penilaian</h2><ActionForm action={saveLearningSettings} label="Simpan pengaturan"><label className="block text-sm">Nomor WhatsApp CS<input name="csPhone" defaultValue={learning.csPhone} required className="mt-2 w-full rounded-xl border p-3" /></label><div className="grid gap-4 md:grid-cols-3">{[["daily_weight", "Harian", learning.weights.DAILY], ["weekly_weight", "Pekanan", learning.weights.WEEKLY], ["final_weight", "Ujian akhir", learning.weights.FINAL]].map(([name,label,value]) => <label key={name} className="text-sm">Bobot {label} (%)<input name={String(name)} type="number" min={0} max={100} required defaultValue={value} className="mt-2 w-full rounded-xl border p-3" /></label>)}</div><p className="text-sm text-gray-500">Total 100%. Nilai setiap kuis memakai bobot soal. Jawaban kosong/salah bernilai 0; multiple choice harus memilih semua jawaban benar tanpa pengecoh. Evaluasi belum dikerjakan dihitung 0.</p></ActionForm></section>
  </>;
}

