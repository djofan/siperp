import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { deletePaymentFeeRef } from "@/modules/lazsip/paymentFees";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  await deletePaymentFeeRef(id);

  return NextResponse.json({ ok: true });
}
