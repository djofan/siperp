import { getTransactionStatus } from "@/modules/payment/api/transaction";
import { CheckoutForm } from "@/modules/payment/components/ui/CheckoutForm";
import { notFound } from "next/navigation";

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

// moduleSource yang sudah punya situs publik sendiri — dipakai buat tautan "kembali",
// bukan buat ngambil komponen Navbar/Footer modul itu (modul payment sengaja gak boleh
// bergantung ke kode modul lain).
const MODULE_HOME_HREF: Record<string, string> = {
  lazsip: "/lazsip",
};

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

  const total = transaction.amount + transaction.adminFee;
  const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || null;
  const homeHref = MODULE_HOME_HREF[transaction.moduleSource] ?? "/";

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
        <a
          href={homeHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-foreground/60 transition-colors hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Kembali ke Beranda
        </a>

        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center rounded-full bg-accent-soft px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-accent-hover">
            Konfirmasi Pembayaran
          </span>
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Selesaikan Pembayaran
          </h1>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="text-base font-bold text-foreground">Ringkasan</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between text-foreground/70">
              <dt>Nominal</dt>
              <dd className="font-medium text-foreground">{formatRupiah(transaction.amount)}</dd>
            </div>
            <div className="flex items-center justify-between text-foreground/70">
              <dt>Biaya admin</dt>
              <dd className="font-medium text-foreground">{formatRupiah(transaction.adminFee)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-foreground">
              <dt>Total</dt>
              <dd>{formatRupiah(total)}</dd>
            </div>
            <div className="flex items-center justify-between text-foreground/70">
              <dt>Metode</dt>
              <dd className="font-medium text-foreground">{transaction.paymentMethod}</dd>
            </div>
          </dl>
        </div>

        <CheckoutForm transaction={transaction} midtransClientKey={midtransClientKey} />
      </div>
    </div>
  );
}
