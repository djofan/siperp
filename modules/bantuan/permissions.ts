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
  if (hasAnyRole(viewer, ["admin", "call_center"])) return true;
  if (row.createdBy !== viewer.id) return false;
  if (hasRole(viewer,"verifier") && ["draft","needs_data","screening","review1","survey_assignment","survey_assigned","bypass_review"].includes(row.status)) return true;
  return hasRole(viewer,"requester") && row.source !== "bypass" && ["draft","needs_data"].includes(row.status);
}

export function canManageOwnPasswordInModule(viewer: RoleViewer & {canChooseModules?:boolean}):boolean { return !viewer.canChooseModules && !hasRole(viewer,"admin"); }
