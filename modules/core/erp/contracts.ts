import type { CoreContact, CoreContactSource, CoreExpense, CoreBankLine, PaymentDestinationAccount, ZakatAcademyCourse } from "@/lib/domain";

export type Contact = CoreContact & { sources: CoreContactSource[] };
export type ContactsResponse = { contacts: Contact[]; count: number; selected: Contact | null };
export type FinanceResponse = {
  accounts: PaymentDestinationAccount[];
  summary: { account: PaymentDestinationAccount; income: number; fees: number; expense: number }[];
  lines: CoreBankLine[]; count: number; expenses: CoreExpense[];
  payments: { id: string; trackingCode: string; amount: number; adminFee: number; destinationAccountId: string; paidAt: Date | null }[];
  candidatesExpenses: CoreExpense[];
};
export type OverviewResponse = {
  income: {moduleSource:string; fundType:string; _sum:{amount:number;adminFee:number}; _count:number}[];
  expenses: {_sum:{amount:number};_count:number}; pending:number; applications:number;
  courses:(ZakatAcademyCourse & {_count:{enrollments:number}})[];
  enrollments:number; unanswered:number; unmatched:number; beneficiaryLaz:number; beneficiarySar:number; contacts:number;
  recent:{id:string;trackingCode:string;amount:number;moduleSource:string;fundType:string;paidAt:Date|null}[];
};
