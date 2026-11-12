"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiRequest } from "@/lib/api";
import { requireAcademyAdmin } from "./admin-access";
import type { ParticipantImportResult, ParticipantImportState } from "./participant-import-contracts";

export async function importAcademyParticipants(_: ParticipantImportState, form: FormData): Promise<ParticipantImportState> {
  await requireAcademyAdmin();
  let rows: unknown;
  try { rows = JSON.parse(String(form.get("rows") ?? "")); }
  catch { return { error: "Baca kembali file Excel sebelum mengimpor." }; }
  let result: ParticipantImportResult;
  try {
    result = await apiRequest<ParticipantImportResult>("academy/admin/participant-imports", {
      method: "POST", body: JSON.stringify({ cohortId: form.get("cohortId"), gender: form.get("gender"), rows }),
    });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, errors: [...new Set(Object.values(error.details ?? {}).flat())] };
    return { error: "Impor belum dapat dipastikan. Periksa Daftar Peserta sebelum mencoba kembali; peserta yang sama akan dilewati." };
  }
  revalidatePath("/admin/academy", "layout");
  revalidatePath("/academy", "layout");
  return { error: "", result };
}
