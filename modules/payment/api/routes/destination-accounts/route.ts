import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createDestinationAccount } from "@/modules/payment/api/destinationAccounts";

const VALID_MODULE_SOURCES = ["lazsip", "sarsip"];
const VALID_FUND_TYPES = ["infak", "zakat", "donasi"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.isSuperadmin) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const moduleSource = typeof body?.moduleSource === "string" ? body.moduleSource : "";
  const fundType = typeof body?.fundType === "string" ? body.fundType : "";
  const bankName = typeof body?.bankName === "string" ? body.bankName.trim() : "";
  const accountNumber = typeof body?.accountNumber === "string" ? body.accountNumber.trim() : "";
  const accountName = typeof body?.accountName === "string" ? body.accountName.trim() : "";

  if (!VALID_MODULE_SOURCES.includes(moduleSource) || !VALID_FUND_TYPES.includes(fundType)) {
    return NextResponse.json({ error: "Modul atau jenis dana tidak valid." }, { status: 400 });
  }
  if (!bankName || !accountNumber || !accountName) {
    return NextResponse.json({ error: "Nama bank, nomor rekening, dan atas nama wajib diisi." }, { status: 400 });
  }

  const account = await createDestinationAccount({ moduleSource, fundType, bankName, accountNumber, accountName });
  return NextResponse.json({ ok: true, id: account.id }, { status: 201 });
}
