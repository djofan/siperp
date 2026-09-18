import { getTransactionStatus } from "@/modules/payment/api/transaction";
import { CheckoutForm } from "@/modules/payment/components/ui/CheckoutForm";
import { notFound } from "next/navigation";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const transaction = await getTransactionStatus(id);

  if (!transaction) {
    notFound();
  }

  return (
    <div>
      <h1>Konfirmasi Pembayaran</h1>
      <p>Nominal: Rp{transaction.amount.toLocaleString("id-ID")}</p>
      <p>Biaya admin: Rp{transaction.adminFee.toLocaleString("id-ID")}</p>
      <p>Total: Rp{(transaction.amount + transaction.adminFee).toLocaleString("id-ID")}</p>
      <p>Status: {transaction.status}</p>
      <CheckoutForm transaction={transaction} />
    </div>
  );
}
