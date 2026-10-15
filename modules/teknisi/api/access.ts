import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiRequest, ApiError } from "@/lib/api";
import type { TeknisiTechnician } from "@/lib/domain";
import { OPERATOR_ROOT } from "./navigation";

export const getTechnicianUser = cache(async () => {
  if (!await getSession()) return null;
  try { return await apiRequest<{ id: string; name: string; role: string; technician: TeknisiTechnician | null; canManage: boolean; canWrite: boolean }>("teknisi/viewer"); }
  catch (error) { if (error instanceof ApiError && [401, 403].includes(error.status)) return null; throw error; }
});
export type TechnicianUser = NonNullable<Awaited<ReturnType<typeof getTechnicianUser>>>;
export async function requireTechnicianUser() {
  const user = await getTechnicianUser();
  if (!user) redirect("/admin?error=forbidden");
  return user;
}
export async function requireTechnicianOperator() {
  const user = await getTechnicianUser();
  if (!user || user.role !== "technician" || !user.technician) redirect("/teknisi/masuk");
  return { ...user, technician: user.technician };
}
export async function requireTechnicianAdminView() {
  const user = await requireTechnicianUser();
  if (user.role === "technician") redirect(OPERATOR_ROOT);
  return user;
}
export { ticketScope, outletScope } from "./policy";
