import { apiCollection } from "@/lib/api";
import type { LazsipProgramApplicant } from "@/contracts/modules/lazsip";
export async function listApplicants() { return apiCollection<LazsipProgramApplicant & { program: { id: string; title: string } }>("lazsip/applicants"); }
