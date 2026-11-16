import { requireAcademyAdmin } from "../../../api/admin-access";
import { academyPage } from "../../../api/page-data";
import type { AcademyCohort } from "../../../api/page-contracts";
import { AdminHeading, SavedNotice } from "../../../components/admin/AdminUi";
import { Card, CardTitle } from "@/components/ui/Card";
import { ActionForm } from "../../../components/ActionForm";
import { ParticipantRegistrationFields } from "@/components/auth/ParticipantRegistrationFields";
import { FormField, Select } from "@/components/ui/FormField";
import { registerAcademyParticipant } from "../../../api/participant-registration";
import { ParticipantExcelImport } from "../../../components/admin/ParticipantExcelImport";

export default async function IntakePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyAdmin();
  const query = await searchParams;
  const cohort = typeof query.cohort === "string" ? query.cohort : "";
  const cohorts = await academyPage<AcademyCohort[]>("academy/admin/cohorts");
  return <>
    <AdminHeading title="Pendaftaran" description="Daftarkan peserta Academy melalui impor Excel atau formulir satu per satu." />
    <SavedNotice saved={query.disimpan === "1"} />
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <ParticipantExcelImport cohorts={cohorts} initialCohort={cohort} />
      <Card><CardTitle>Daftarkan peserta satu per satu</CardTitle>
        <ActionForm action={registerAcademyParticipant} label="Daftarkan Peserta" className="mt-5">
          <ParticipantRegistrationFields academy />
          <FormField label="Angkatan" htmlFor="participant-cohort">
            <Select id="participant-cohort" name="cohortId" required defaultValue={cohort}>
              <option value="" disabled>Pilih angkatan</option>
              {cohorts.map(item => <option key={item.id} value={item.id}>{item.title} · {item.participants_count} peserta</option>)}
            </Select>
          </FormField>
        </ActionForm>
      </Card>
    </div>
  </>;
}
