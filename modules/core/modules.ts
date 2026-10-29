import { apiRequest } from "@/lib/api";
import type { SessionPayload } from "@/lib/session";

export interface CoreModule { id: string; slug: string; name: string; description: string | null; isActive: boolean }
export async function listModules() { return apiRequest<CoreModule[]>("core/modules"); }
export async function countActiveModules() { return (await listModules()).filter(module => module.isActive).length; }
export async function listAccessibleModules(session: SessionPayload) {
  return (await listModules()).filter(module => module.isActive && (session.isSuperadmin || session.moduleSlugs.includes(module.slug)));
}
export async function setModuleActive(id: string, isActive: boolean) {
  await apiRequest(`super/modul/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify({ isActive }) });
}
export async function accountPanelRedirect(session: SessionPayload) { return session.panelRedirect ?? null; }
