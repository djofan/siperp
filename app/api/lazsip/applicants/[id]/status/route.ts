import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { setApplicantStatus } from "@/modules/lazsip/applicants";

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
  if (typeof body?.status !== "string") {
    return NextResponse.json({ error: "status wajib diisi." }, { status: 400 });
  }

  try {
    await setApplicantStatus(id, body.status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah status.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
