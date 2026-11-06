import "server-only";
import { apiRequest } from "@/lib/api";
import type { ParticipantModule } from "./participant-policy";
export async function createParticipantAccount(moduleSlug: ParticipantModule, form: FormData) {
 return apiRequest<{ userId: string; nip: string }>(`${moduleSlug}/participants`, { method: "POST", body: form });
}
