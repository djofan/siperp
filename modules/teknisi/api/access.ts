import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OPERATOR_ROOT } from "./navigation";

export const getTechnicianUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { moduleAccess: { where: { module: { slug: "teknisi", isActive: true } } } } });
  const registration = await prisma.module.findUnique({ where: { slug: "teknisi" } });
  if (!user?.isActive || !registration?.isActive) return null;
  const role = user.isSuperadmin ? "admin" : user.moduleAccess[0]?.role;
  if (!role || !["admin", "manager", "technician", "monitoring"].includes(role)) return null;
  const technician = role === "technician" ? await prisma.teknisiTechnician.findUnique({ where: { userId: user.id } }) : null;
  if (role === "technician" && (!technician?.isActive || !await prisma.teknisiOutlet.findFirst({where:{id:technician.outletId,isActive:true},select:{id:true}}))) return null;
  return { id: user.id, name: user.name, role, technician, canManage: role === "admin" || role === "manager", canWrite: role !== "monitoring" };
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
