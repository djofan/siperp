import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { setStatusById } from "@/modules/payment/api/transaction";
import { prisma } from "@/lib/prisma";
import { revalidateSourcePaymentViews } from "@/modules/payment/api/revalidate";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trx = await prisma.paymentTransaction.findUnique({ where: { id }, select: { moduleSource: true } });
  if (!trx) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  }

  const session = await getSession();
  if (!hasModuleAccess(session, trx.moduleSource)) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.status !== "paid" && body?.status !== "failed") {
    return NextResponse.json({ error: "status wajib 'paid' atau 'failed'." }, { status: 400 });
  }

  await setStatusById(id, body.status);
  revalidateSourcePaymentViews(trx.moduleSource);
  return NextResponse.json({ ok: true });
}
