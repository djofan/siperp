import { FormField, Select } from "@/components/ui/FormField";
import type { AcademyCohort } from "../../api/page-contracts";

export function CohortField({ cohorts, value = "", exclude, id = "material-cohort" }: { cohorts: AcademyCohort[]; value?: string; exclude?: string | null; id?: string }) {
  return <FormField label="Angkatan" htmlFor={id}><Select id={id} name="cohortId" required defaultValue={value}><option value="" disabled>Pilih angkatan</option>{cohorts.filter(item => item.id !== exclude).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></FormField>;
}
