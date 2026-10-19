import "server-only";
import { apiRequest } from "@/lib/api";
import type { ParticipantModule } from "./participant-policy";
export async function editParticipantAccount(moduleSlug: ParticipantModule, id: string, form: FormData) {
 await apiRequest(`${moduleSlug}/participants/${encodeURIComponent(id)}`, { method: "PUT", body: form });
}
export async function deleteParticipantAccount(moduleSlug: ParticipantModule, id: string) {
 await apiRequest(`${moduleSlug}/participants/${encodeURIComponent(id)}`, { method: "DELETE" });
}
