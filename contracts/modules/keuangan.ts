export type KeuanganOverview = {
  phase: "workflow";
  readOnly: boolean;
  role: "superadmin" | "admin" | "finance_admin" | "treasurer" | "operator";
  roleLabel: string;
  permissions: { writeExpenses: boolean; writeMasters: boolean; readMasters: boolean; readApprovals: boolean; manageAccounts: boolean };
  counts: { expenses: number; sources: number | null; categories: number | null; myPendingApprovals: number | null };
};

export type FinanceOptions = { sources: {id:string;name:string}[]; categories: {id:string;name:string}[]; programs:{id:string;name:string}[];treasurers:{id:string;name:string}[] };
export type FinanceExpense = {programId:string|null;program:string|null;requestedOn:string|null;recipientIdentity:string|null;treasurerId:string|null;treasurer:string|null;createdBy:string|null;id:string;recipient:string;description:string;amount:string;sourceId:string;categoryId:string;source:string;category:string;version:number;revision:number;origin:string;createdAt:string|Date|null;status:"unassigned"|"waiting"|"approved"|"rejected"};
export type FinanceApproval = {canDecide:boolean;id:string;expenseId:string;version:number;revision:number;decision:"waiting"|"approved"|"rejected";note:string|null;closed:boolean;closeReason:string|null};
export type FinanceHistory = {id:string;action:string;reason:string|null;actor:string|null;at:string|Date;revision?:number;subject?:string;changes:unknown};
export type FinanceDetail = FinanceExpense & { signoffs:{name:string;decision:string;closed:boolean}[]; approvals:(Omit<FinanceApproval,"expenseId"|"canDecide"> & {name:string;mine:boolean})[]; history:FinanceHistory[];decisionHistory:FinanceHistory[] };
export type FinanceApprovalDetail = FinanceApproval & {expense:FinanceExpense;history:FinanceHistory[]};
export type FinancePage<T> = {items:T[];page:number;pages:number;total:number};
export type FinanceRule = {id:string;version:number;minAmount:string;maxAmount:string;active:boolean;approverIds:string[]};
export type FinanceSettings = { programs:{id:string;name:string;archived:boolean}[]; sources: {id:string;name:string;archived:boolean}[]; categories:{id:string;name:string;archived:boolean}[];approvers:{id:string;name:string}[];rules:FinanceRule[]};
