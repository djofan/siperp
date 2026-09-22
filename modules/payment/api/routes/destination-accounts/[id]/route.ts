import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteDestinationAccount } from "@/modules/payment/api/destinationAccounts";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.isSuperadmin) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteDestinationAccount(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus rekening.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
