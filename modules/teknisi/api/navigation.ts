export const OPERATOR_ROOT = "/teknisi/panel";
export const ADMIN_ROOT = "/admin/teknisi";
export function operationalRoot(role: string) { return role === "technician" ? OPERATOR_ROOT : ADMIN_ROOT; }
