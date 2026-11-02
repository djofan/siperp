import { apiRequest, apiCollection, ApiError } from "@/lib/api";
import type { SarsipEntry, SarsipProfile, SarsipPaymentMethod } from "@/contracts/modules/sarsip";
import type { PaymentTransaction } from "@/contracts/modules/payment";
export const KINDS = ["kegiatan", "campaign", "berita"] as const;
export type EntryKind = typeof KINDS[number];
export function isEntryKind(value: string): value is EntryKind { return KINDS.includes(value as EntryKind); }
export const money = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);


export async function getProfile() { return apiRequest<SarsipProfile>("sarsip/profile"); }
export async function listEntries(kind?: EntryKind, admin = false) { return apiCollection<SarsipEntry & { currentAmount: number }>(`sarsip/${admin ? "admin/" : ""}entries${kind ? "?kind=" + kind : ""}`); }
export async function getEntry(id: string, kind: EntryKind, admin = false) {
  try { return await apiRequest<SarsipEntry & { currentAmount: number }>(`sarsip/${admin ? "admin/" : ""}entries/${encodeURIComponent(id)}?kind=${kind}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export async function listPublicDonations(id: string) { return apiCollection<{ id: string; amount: number; name: string }>(`sarsip/entries/${encodeURIComponent(id)}/donations`); }
export async function listAdminTransactions() { return apiCollection<PaymentTransaction & { donor: { id: string; name: string; phone: string | null } }>("sarsip/admin/transactions"); }
export async function listPaymentMethods() { return apiRequest<SarsipPaymentMethod[]>("sarsip/payment-methods"); }
