import { NextResponse } from "next/server";
import { getProgramById } from "@/modules/lazsip/programs";
import { createApplicant } from "@/modules/lazsip/applicants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const program = await getProgramById(id);

  if (!program) {
    return NextResponse.json({ error: "Program tidak ditemukan." }, { status: 404 });
  }
  if (!program.registrationOpen) {
    return NextResponse.json({ error: "Pendaftaran program ini sedang ditutup." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const contact = typeof body?.contact === "string" ? body.contact.trim() : "";

  if (!name || !contact) {
    return NextResponse.json({ error: "Nama dan kontak wajib diisi." }, { status: 400 });
  }

  await createApplicant({ programId: id, name, contact });

  return NextResponse.json({ ok: true }, { status: 201 });
}
