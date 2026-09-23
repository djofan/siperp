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
  const isMidtrans = transaction.gateway === "midtrans_sandbox";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:py-20">
      <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{isMidtrans ? "Midtrans sandbox" : "Mode simulasi"}</span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Konfirmasi Pembayaran</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{isMidtrans ? "Uji pembayaran melalui Midtrans. Gunakan simulasi pada mode test; jangan transfer uang nyata." : "Ini simulasi donasi. Tidak ada uang yang ditagihkan atau dipindahkan. Anda tidak perlu melakukan transfer."}</p>
        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Kode transaksi — simpan untuk cek status</p>
          <p className="mt-1 break-all font-mono text-sm text-slate-800">{transaction.id}</p>
        </div>
        <dl className="mt-6 space-y-3 text-sm text-slate-600">
          <div className="flex justify-between gap-4"><dt>Metode pembayaran</dt><dd className="text-right">{isMidtrans ? "Dipilih di Midtrans" : transaction.paymentMethod}</dd></div>
          <div className="flex justify-between gap-4"><dt>Nominal donasi</dt><dd>Rp{transaction.amount.toLocaleString("id-ID")}</dd></div>
          <div className="flex justify-between gap-4"><dt>Biaya admin</dt><dd>Rp{transaction.adminFee.toLocaleString("id-ID")}</dd></div>
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 font-bold text-slate-900"><dt>Total simulasi</dt><dd>Rp{(transaction.amount + transaction.adminFee).toLocaleString("id-ID")}</dd></div>
        </dl>
        <CheckoutForm key={transaction.id} transaction={{ id: transaction.id, trackingCode: transaction.trackingCode, status: transaction.status, moduleSource: transaction.moduleSource, gateway: transaction.gateway }} />
      </section>
    </main>
  );
}
