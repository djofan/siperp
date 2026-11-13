import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { getAdminSettings } from "@/modules/academy/api/admin-participants";
import { saveAcademyMaintenance } from "@/modules/academy/api/actions";
import { AdminHeading, SavedNotice } from "@/modules/academy/components/admin/AdminUi";
import { MaintenanceForm } from "@/modules/academy/components/admin/ParticipantForms";
import { getLearningSettings } from "@/modules/academy/api/learning";
import { saveLearningSettings } from "@/modules/academy/api/intake-actions";
import { AcademyContactsForm } from "@/modules/academy/components/admin/AcademyContactsForm";
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
    <section className="mt-6 rounded-2xl bg-white p-6"><AcademyContactsForm action={saveLearningSettings} initial={learning.csContacts ?? [{ name: "CS Academy", phone: learning.csPhone }]} /></section>
  </>;
}

