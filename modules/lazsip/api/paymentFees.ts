import { apiRequest, apiCollection } from "@/lib/api";
import type { LazsipPaymentFeeRef } from "@/contracts/modules/lazsip";
export { calculateFee } from "./feeCalculation";
export async function listPaymentFeeRefs() { return apiCollection<LazsipPaymentFeeRef>("lazsip/payment-fees"); }
export async function getPaymentFeeRef(method: string) { return (await listPaymentFeeRefs()).find(item => item.method === method) ?? null; }
export async function listCheckoutMethods() { return apiRequest<LazsipPaymentFeeRef[]>("lazsip/checkout-methods"); }
