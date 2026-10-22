import { apiCollection } from "@/lib/api";
import type { LazsipDonation } from "@/lib/domain";
export async function listDonationsForAdmin() { return apiCollection<LazsipDonation & { donorName: string; campaign: { title: string; uniqueCode: string }; donor: { name: string } }>("lazsip/admin/donations/legacy"); }
export async function listPaymentDonationsForAdmin() { return apiCollection<{ id: string; trackingCode: string; gateway: string; donorName: string; amount: number; adminFee: number; paymentMethod: string; status: string; createdAt: Date; campaign: { title: string } }>("lazsip/admin/donations/payments"); }
