// Stable data contracts only; no runtime module implementation imports.

export interface PaymentDonor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
}

export interface PaymentTransaction {
  id: string;
  trackingCode: string;
  moduleSource: string;
  sourceType: string;
  sourceId: string;
  fundType: string;
  donorId: string;
  isAnonymous: boolean;
  amount: number;
  adminFee: number;
  paymentMethod: string;
  destinationAccountId: string;
  status: string;
  gatewayReferenceId: string | null;
  gatewaySessionId: string | null;
  gatewayTransactionId: string | null;
  gateway: string;
  gatewayState: string;
  gatewayAccountId: string | null;
  gatewayCheckoutUrl: string | null;
  createdAt: Date;
  paidAt: Date | null;
}

export interface PaymentDestinationAccount {
  id: string;
  moduleSource: string;
  fundType: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}
