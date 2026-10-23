// Stable data contracts only; no runtime module implementation imports.

export interface SarsipBeneficiary {
  id: string;
  name: string;
  phone: string | null;
  location: string;
  assistance: string;
  publicName: string | null;
  category: string;
  amount: number;
  image: string | null;
  isPublished: boolean;
  receivedAt: Date;
  notes: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SarsipEntry {
  id: string;
  kind: string;
  title: string;
  description: string;
  location: string | null;
  eventDate: Date | null;
  image: string | null;
  targetAmount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SarsipProfile {
  id: string;
  headline: string;
  description: string;
  contact: string | null;
}

export interface SarsipPaymentMethod {
  id: string;
  method: string;
  feeAmount: number | null;
  feePercentage: number | null;
}
