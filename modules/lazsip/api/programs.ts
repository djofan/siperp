import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { LazsipProgram } from "@/lib/domain";
export async function listPrograms() { return apiCollection<LazsipProgram>("lazsip/programs"); }
export async function getProgramById(id: string) {
  try { return await apiRequest<LazsipProgram>(`lazsip/programs/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export async function listProgramsByType(type: string) { return apiCollection<LazsipProgram>(`lazsip/programs?type=${encodeURIComponent(type)}`); }
