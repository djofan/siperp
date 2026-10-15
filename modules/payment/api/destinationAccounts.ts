import { apiCollection } from "@/lib/api";
import type { PaymentDestinationAccount } from "@/lib/domain";
export async function listDestinationAccounts() { return apiCollection<PaymentDestinationAccount>("payment/destination-accounts"); }
