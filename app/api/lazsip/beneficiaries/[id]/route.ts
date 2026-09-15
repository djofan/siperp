import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { updateBeneficiary, deleteBeneficiary } from "@/modules/lazsip/beneficiaries";

const VALID_AID_TYPES = ["pendidikan", "kesehatan", "kebutuhan_pokok", "lainnya"];
const VALID_MARITAL_STATUSES = [
  "menikah",
  "janda-cerai",
  "janda-meninggal",
  "duda-cerai",
  "duda-meninggal",
];

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
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const problemFaced = typeof body?.problemFaced === "string" ? body.problemFaced.trim() : "";
  const birthDate = typeof body?.birthDate === "string" ? new Date(body.birthDate) : null;
  const age = Number(body?.age);
  const gender = typeof body?.gender === "string" ? body.gender.trim() : "";
  const referralSource = typeof body?.referralSource === "string" ? body.referralSource.trim() : "";
  const photo = typeof body?.photo === "string" && body.photo.trim() ? body.photo.trim() : undefined;
  const needs = typeof body?.needs === "string" ? body.needs.trim() : "";
  const aidType = VALID_AID_TYPES.includes(body?.aidType) ? body.aidType : "lainnya";
  const amountReceived = Number(body?.amountReceived);
  const verifierName = typeof body?.verifierName === "string" ? body.verifierName.trim() : "";
  const verifierArea = typeof body?.verifierArea === "string" ? body.verifierArea.trim() : "";
  const maritalStatus = VALID_MARITAL_STATUSES.includes(body?.maritalStatus) ? body.maritalStatus : "";

  if (
    !name ||
    !address ||
    !problemFaced ||
    !birthDate ||
    Number.isNaN(birthDate.getTime()) ||
    !Number.isFinite(age) ||
    !gender ||
    !referralSource ||
    !needs ||
    !Number.isFinite(amountReceived) ||
    !verifierName ||
    !verifierArea ||
    !maritalStatus
  ) {
    return NextResponse.json({ error: "Semua field wajib diisi dengan benar." }, { status: 400 });
  }

  await updateBeneficiary(id, {
    name,
    address,
    problemFaced,
    birthDate,
    age,
    gender,
    referralSource,
    photo,
    needs,
    aidType,
    amountReceived,
    verifierName,
    verifierArea,
    maritalStatus,
  });

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
  await deleteBeneficiary(id);

  return NextResponse.json({ ok: true });
}
