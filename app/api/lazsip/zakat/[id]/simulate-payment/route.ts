import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { setZakatPaymentStatus } from "@/modules/lazsip/zakat";

/** [§7-CHECKPOINT] Sama seperti donasi — simulasi admin, rekening zakat terpisah dari donasi. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body?.status !== "paid" && body?.status !== "failed") {
    return NextResponse.json({ error: "status wajib 'paid' atau 'failed'." }, { status: 400 });
  }

  await setZakatPaymentStatus(id, body.status);

  return NextResponse.json({ ok: true });
}
