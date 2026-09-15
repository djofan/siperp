import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { createPartner } from "@/modules/lazsip/api/partners";

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const logo = typeof body?.logo === "string" && body.logo.trim() ? body.logo.trim() : undefined;
  const url = typeof body?.url === "string" && body.url.trim() ? body.url.trim() : undefined;

  if (!name) {
    return NextResponse.json({ error: "Nama mitra wajib diisi." }, { status: 400 });
  }

  const partner = await createPartner({ name, logo, url });

  return NextResponse.json({ ok: true, id: partner.id }, { status: 201 });
}
