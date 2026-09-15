import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { PaymentFeeManager } from "@/modules/lazsip/components/admin/PaymentFeeManager";
import { listPaymentFeeRefs } from "@/modules/lazsip/api/paymentFees";

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
