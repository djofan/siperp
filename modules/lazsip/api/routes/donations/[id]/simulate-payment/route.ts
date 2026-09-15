import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { setDonationStatus } from "@/modules/lazsip/api/donations";

/**
 * [§7-CHECKPOINT] Endpoint SIMULASI khusus admin selama payment gateway asli belum
 * terpasang (docs/prd-lazsip.md §8). Ini bersama webhook gateway nanti adalah SATU-SATUNYA
 * jalan status donasi berubah jadi paid/failed — tidak boleh dipanggil dari halaman
 * redirect sukses di sisi client. Middleware/proxy tidak melindungi route API secara
 * otomatis, jadi guard superadmin/module_access wajib eksplisit di sini.
 */
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

  await setDonationStatus(id, body.status);

  return NextResponse.json({ ok: true });
}
