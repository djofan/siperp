import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { updatePartner, deletePartner } from "@/modules/lazsip/partners";

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
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const logo = typeof body?.logo === "string" && body.logo.trim() ? body.logo.trim() : undefined;
  const url = typeof body?.url === "string" && body.url.trim() ? body.url.trim() : undefined;

  if (!name) {
    return NextResponse.json({ error: "Nama mitra wajib diisi." }, { status: 400 });
  }

  await updatePartner(id, { name, logo, url });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  await deletePartner(id);

  return NextResponse.json({ ok: true });
}
