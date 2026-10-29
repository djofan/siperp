// Stable data contracts only; no runtime module implementation imports.

export interface User {
  id: string;
  name: string;
  code: string;
  email: string;
  isSuperadmin: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface AccessLog {
  id: string;
  message: string;
  createdAt: Date;
}

export interface Module {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ModuleAccess {
  id: string;
  userId: string;
  moduleId: string;
  role: string;
  createdAt: Date;
}

export interface ParticipantSequence {
  moduleSlug: string;
  lastNumber: number;
}

export interface CoreContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoreContactSource {
  id: string;
  contactId: string;
  source: string;
  sourceId: string;
  role: string;
  name: string;
  phone: string | null;
  email: string | null;
  syncedAt: Date;
}

export interface CoreExpense {
  id: string;
  accountId: string;
  moduleSource: string;
  fundType: string;
  amount: number;
  description: string;
  reference: string;
  spentAt: Date;
  createdBy: string;
  createdAt: Date;
}

export interface CoreBankLine {
  id: string;
  accountId: string;
  bookedAt: Date;
  reference: string;
  description: string;
  direction: string;
  amount: number;
  fingerprint: string;
  paymentId: string | null;
  expenseId: string | null;
  matchNote: string | null;
  matchedBy: string | null;
  matchedAt: Date | null;
  createdAt: Date;
}
