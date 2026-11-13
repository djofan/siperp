import { dependentErrors } from "./dependents";

export const surveyApplicantKeys = ["housing", "rent", "rentPeriod", "dependentCount", "dependents"];
export function isRentedHousing(value: unknown): boolean {
  return /kontrak|sewa|rent/i.test(String(value ?? ""));
}
export function surveyApplicantErrors(values: Record<string, unknown>): Record<string, string[]> {
  const errors = dependentErrors(values.dependents);
  const rows = values.dependents;
  if (!(Number(values.dependentCount) === 0 && (rows == null || rows === "")) && (!Array.isArray(rows) || rows.length !== Number(values.dependentCount ?? 0))) {
    errors.dependents = ["Rinci setiap tanggungan sesuai jumlahnya. Jika tidak ada, isi jumlah 0 dan kosongkan daftar."];
  }
  if (isRentedHousing(values.housing)) {
    if (!Number.isInteger(Number(values.rent)) || Number(values.rent) <= 0) errors.rent = ["Isi biaya kontrak/sewa lebih dari Rp 0."];
    if (!["bulan", "tahun"].includes(String(values.rentPeriod))) errors.rentPeriod = ["Pilih periode biaya sewa: bulan atau tahun."];
  }
  return errors;
}
