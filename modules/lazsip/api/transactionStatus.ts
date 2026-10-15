import { apiRequest } from "@/lib/api";
export interface TransactionStatusResult {
  found: boolean;
  code: string;
  type: "donasi" | "zakat";
  label: string;
  amount: number;
  adminFee: number;
  paymentMethod: string;
  status: string;
  createdAt: Date;
  // Cuma terisi untuk transaksi PaymentTransaction (gateway) yang masih `pending` — dipakai
  // publik buat tombol "Lanjutkan Pembayaran" balik ke halaman checkout (liat lagi VA/QRIS),
  // BUKAN identitas donatur, jadi aman diekspos (halaman checkout sendiri publik tanpa login).
  checkoutId?: string;
  gateway?: string;
}
export async function getTransactionStatus(code: string) { return apiRequest<TransactionStatusResult | { found: false }>("lazsip/transactions/status", { method: "POST", body: JSON.stringify({ code }) }); }
