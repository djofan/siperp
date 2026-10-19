import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { LazsipBeneficiary } from "@/lib/domain";
type PublicCard = Pick<LazsipBeneficiary, "id" | "name" | "age" | "amountReceived" | "aidType" | "photo" | "isPinned" | "verifierArea" | "verifierName">;
type PublicDetail = Pick<LazsipBeneficiary, "id" | "name" | "age" | "problemFaced" | "gender" | "photo" | "referralSource" | "needs" | "aidType" | "amountReceived" | "verifierName" | "verifierArea">;
export async function listBeneficiariesForAdmin() { return apiCollection<LazsipBeneficiary>("lazsip/admin/beneficiaries"); }
export async function getBeneficiaryForAdmin(id: string) {
  try { return await apiRequest<LazsipBeneficiary>(`lazsip/admin/beneficiaries/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export async function listBeneficiariesPublic(aidType?: string, verifierName?: string) {
  const query = new URLSearchParams();
  if (aidType) query.set("aidType", aidType); if (verifierName) query.set("verifierName", verifierName);
  return apiCollection<PublicCard>("lazsip/beneficiaries?" + query);
}
export async function getBeneficiaryPublicById(id: string) {
  try { return await apiRequest<PublicDetail>(`lazsip/beneficiaries/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
async function filters() { return apiRequest<{ count: number; areas: string[]; names: string[] }>("lazsip/verifier-filters"); }
export async function countBeneficiaries() { return (await filters()).count; }
export async function listDistinctVerifierAreas() { return (await filters()).areas; }
export async function listDistinctVerifierNames() { return (await filters()).names; }
