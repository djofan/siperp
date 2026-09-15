import { AdminPageHeader } from "@/components/lazsip/admin/AdminPageHeader";
import { PaymentFeeManager } from "@/components/lazsip/admin/PaymentFeeManager";
import { listPaymentFeeRefs } from "@/modules/lazsip/paymentFees";

export default async function BiayaPaymentPage() {
  const fees = await listPaymentFeeRefs();

  return (
    <div>
      <AdminPageHeader
        title="Referensi Biaya Payment"
        description="Dipakai untuk menghitung total tagihan saat donatur mencentang 'tanggung biaya admin'."
      />
      <PaymentFeeManager fees={fees} />
    </div>
  );
}
