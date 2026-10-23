import { requireAcademyAdmin } from "../../../../api/admin-access";
import { saveMaterial } from "../../../../api/material-actions";
import { AdminHeading } from "../../../../components/admin/AdminUi";
import { ContentForm } from "../../../../components/admin/ContentForm";
import { academyPage } from "../../../../api/page-data";
import type { AcademyCohort } from "../../../../api/page-contracts";
import { listMaterials } from "../../../../api/materials";
import { CohortField } from "../../../../components/admin/CohortField";
export default async function NewMaterialPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  await requireAcademyAdmin();
  const cohorts = await academyPage<AcademyCohort[]>("academy/admin/cohorts");
  const { cohort = "" } = await searchParams;
  const nextOrder = cohort ? (await listMaterials("", 1, true, "", cohort)).nextOrder ?? 1 : 1;
  return <><AdminHeading title="Tambah materi" description="Pilih angkatan, isi data materi, unggah audio, lalu tentukan publikasinya." backHref={"/admin/academy/materi?cohort=" + encodeURIComponent(cohort)} /><ContentForm kind="lesson" flat uploadAudio initial={{ order: nextOrder }} contextField={<CohortField cohorts={cohorts} value={cohort} />} action={saveMaterial.bind(null, null)} /></>;
}
