import { bantuanRoles, type AidApplication, type BantuanViewer } from "@/contracts/modules/bantuan";

export type RoleViewer = Pick<BantuanViewer, "role"> & Partial<Pick<BantuanViewer, "roles">>;
export function rolesOf(viewer: RoleViewer): string[] {
  return [...new Set([viewer.role, ...(viewer.roles ?? [])])].filter(role => Object.hasOwn(bantuanRoles, role));
}
export function hasRole(viewer: RoleViewer, role: string): boolean { return rolesOf(viewer).includes(role); }
export function hasAnyRole(viewer: RoleViewer, roles: string[]): boolean { return rolesOf(viewer).some(role => roles.includes(role)); }
export function roleLabel(viewer: RoleViewer): string { return rolesOf(viewer).map(role => bantuanRoles[role]).join(" · "); }
export function intakeViewer(viewer: BantuanViewer, direct = false): BantuanViewer {
  const role = (direct ? ["admin", "call_center", "verifier"] : ["admin", "call_center", "requester", "verifier"]).find(role => hasRole(viewer, role)) ?? viewer.role;
  return { ...viewer, role };
}
export function canEditIntake(viewer: BantuanViewer, row: AidApplication): boolean {
  return ["draft", "needs_data", "screening"].includes(row.status) && (hasAnyRole(viewer, ["admin", "call_center"]) || row.createdBy === viewer.id && (hasRole(viewer, "requester") && row.source !== "bypass" && ["draft", "needs_data"].includes(row.status) || hasRole(viewer, "verifier") && row.source === "bypass"));
}
