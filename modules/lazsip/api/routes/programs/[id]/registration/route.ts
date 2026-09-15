import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { setProgramRegistrationOpen } from "@/modules/lazsip/api/programs";

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
  if (typeof body?.registrationOpen !== "boolean") {
    return NextResponse.json({ error: "registrationOpen wajib boolean." }, { status: 400 });
  }

  await setProgramRegistrationOpen(id, body.registrationOpen);

  return NextResponse.json({ ok: true });
}
