import { apiRequest, ApiError } from "@/lib/api";

export interface CoreUser {
  id: string;
  name: string;
  code: string;
  email: string;
  isSuperadmin: boolean;
  isActive: boolean;
  createdAt: Date;
  moduleAccess: { id: string; role: string; module: { id: string; name: string; slug: string } }[];
}

type Overview = { users: number; superadmins: number; activeModules: number; accessChanges: number };
export async function countUsers() { return (await apiRequest<Overview>("core/overview")).users; }
export async function countSuperadmins() { return (await apiRequest<Overview>("core/overview")).superadmins; }
export async function listUsersWithAccess() { return apiRequest<CoreUser[]>("super/akun"); }
export async function getUserWithAccess(id: string) {
  try { return await apiRequest<CoreUser>(`super/akun/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export async function createUserWithAccess(input: { name: string; email?: string; password: string; isSuperadmin: boolean; moduleIds: string[] }) {
  return apiRequest<CoreUser>("super/akun", { method: "POST", body: JSON.stringify(input) });
}
export async function updateUser(id: string, input: { name: string; email: string; password?: string }) {
  return apiRequest<CoreUser>(`super/akun/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}
export async function deleteUser(id: string) { await apiRequest(`super/akun/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export async function setUserActive(id: string, isActive: boolean) {
  await apiRequest(`super/akun/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify({ isActive }) });
}
export async function setUserModuleAccess(id: string, entries: { moduleId: string; role: string }[]) {
  await apiRequest(`super/akun/${encodeURIComponent(id)}/access`, { method: "PUT", body: JSON.stringify({ entries }) });
}
