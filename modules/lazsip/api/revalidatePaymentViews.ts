import { revalidatePath } from "next/cache";

/** Call from payment-confirmation route handlers after the database commit. */
export function revalidatePaymentViews() {
  revalidatePath("/lazsip", "layout");
  revalidatePath("/admin/lazsip", "layout");
  revalidatePath("/payment/checkout/[id]", "page");
}
