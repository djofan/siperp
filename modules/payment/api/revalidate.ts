import { revalidatePath } from "next/cache";

export function revalidateSourcePaymentViews(moduleSource: string) {
  if (moduleSource === "lazsip" || moduleSource === "sarsip") {
    revalidatePath(`/${moduleSource}`, "layout");
    revalidatePath(`/admin/${moduleSource}`, "layout");
  }
  revalidatePath("/payment/checkout/[id]", "page");
}
