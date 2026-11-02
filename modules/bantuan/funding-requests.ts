export interface FundingCandidate {
  id: string; number: string; name: string; program: string; region: string;
  amount: number; version: number; status: string;
}
export interface FundingBatch {
  id: string; number: string; title: string; notes: string | null;
  status: "submitted" | "approved" | "rejected"; totalAmount: number; version: number;
  createdBy: string; createdAt: string; decidedBy: string | null; decidedAt: string | null; reason: string | null;
  items: (FundingCandidate & { submittedVersion: number; decisionVersion: number | null; currentAmount: number | null })[];
}
export interface FundingPage<T> {
  data: T[]; current_page: number; last_page: number;
  summary: { count: number; totalAmount: number };
}
