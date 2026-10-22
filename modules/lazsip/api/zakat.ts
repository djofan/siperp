import { apiRequest, apiCollection } from "@/lib/api";
import type { LazsipZakatPayment } from "@/lib/domain";
export async function calculateZakat(hartaAmount: number) { return apiRequest<{ goldPricePerGram: number; nisabValue: number; isWajibZakat: boolean; zakatAmount: number }>("lazsip/zakat/calculate", { method: "POST", body: JSON.stringify({ hartaAmount }) }); }
export async function getZakatFitrahPricePerJiwa() { return (await apiRequest<{ fitrahPricePerJiwa: number }>("lazsip/zakat/settings")).fitrahPricePerJiwa; }
export async function calculateZakatFitrah(jiwaCount: number) { return apiRequest<{ pricePerJiwa: number; jiwaCount: number; totalAmount: number }>("lazsip/zakat/calculate-fitrah", { method: "POST", body: JSON.stringify({ jiwaCount }) }); }
export async function listZakatPaymentsForAdmin() { return apiCollection<LazsipZakatPayment & { donorName: string; donor: { name: string } }>("lazsip/admin/zakat/legacy"); }
export async function listPaymentZakatForAdmin() { return apiCollection<{ id: string; trackingCode: string; gateway: string; donorName: string; zakatType: "maal" | "fitrah"; amount: number; adminFee: number; paymentMethod: string; status: string; createdAt: Date }>("lazsip/admin/zakat/payments"); }
