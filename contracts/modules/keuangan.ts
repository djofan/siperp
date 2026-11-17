export type KeuanganOverview = {
  phase: "foundation";
  readOnly: true;
  role: "superadmin" | "admin" | "finance_admin" | "treasurer" | "approver" | "operator";
  roleLabel: string;
  permissions: { readMasters: boolean; readApprovals: boolean; manageAccounts: boolean };
  counts: { expenses: number; sources: number | null; categories: number | null; myPendingApprovals: number | null };
};
