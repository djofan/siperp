import { apiRequest, apiCollection } from "@/lib/api";
import type { SarsipBeneficiary } from "@/contracts/modules/sarsip";
export async function listPublicBeneficiaries() { return apiCollection<Pick<SarsipBeneficiary, "id" | "publicName" | "category" | "amount" | "image">>("sarsip/beneficiaries"); }
export async function listAdminBeneficiaries() { return apiCollection<SarsipBeneficiary>("sarsip/admin/beneficiaries"); }
export async function getTransparency() { return apiRequest<{ totalAmount: number; donorCount: number; beneficiaryCount: number }>("sarsip/transparency"); }
