import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { getAdminSettings } from "@/modules/academy/api/admin-participants";
import { saveAcademyMaintenance } from "@/modules/academy/api/actions";
import { AdminHeading, SavedNotice } from "@/modules/academy/components/admin/AdminUi";
import { MaintenanceForm } from "@/modules/academy/components/admin/ParticipantForms";
export default async function Page({ searchParams }: { searchParams: Promise<{ tersimpan?: string }> }) {
  await requireAcademyAdmin();
  const settings = await getAdminSettings();
  return <><AdminHeading title="Pengaturan Academy" description="Atur akses peserta selama pemeliharaan." />
    <SavedNotice saved={(await searchParams).tersimpan === "1"} />
    <section className="space-y-5 rounded-2xl bg-surface p-6">
      <p className="text-sm text-foreground">{!settings.registered ? "Modul belum terdaftar di Core. Hubungi pengelola Core untuk mendaftarkan Academy." : settings.active ? "Modul aktif di Core." : "Modul nonaktif di Core. Pengelola Core perlu mengaktifkannya sebelum peserta dapat mengakses Academy."}</p>
      <MaintenanceForm action={saveAcademyMaintenance} initial={settings.maintenance} />
    </section>
  </>;
}

