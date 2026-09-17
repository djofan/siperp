"use client";

import { useState } from "react";
import type { PaymentTransaction } from "@/generated/prisma/client";

export function CheckoutForm({ transaction }: { transaction: PaymentTransaction }) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    // TODO: panggil Snap.js Midtrans di sini pakai transaction.id / midtransOrderId
    setLoading(false);
  }

  return (
    <button onClick={handlePay} disabled={loading || transaction.status !== "pending"}>
      {loading ? "Memproses..." : "Bayar Sekarang"}
    </button>
  );
}