import { apiCollection } from "@/lib/api";
import type { PaymentDestinationAccount } from "@/contracts/modules/payment";
export async function listDestinationAccounts() { return apiCollection<PaymentDestinationAccount>("payment/destination-accounts"); }
