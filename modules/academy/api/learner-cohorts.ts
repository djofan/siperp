import "server-only";
import { apiRequest } from "@/lib/api";
export type LearnerCohort = { id: string; title: string; registrationOpen: boolean; joined: boolean; current: boolean; finished: boolean };
export async function learnerCohorts() { return apiRequest<LearnerCohort[]>("academy/learning/cohorts"); }
