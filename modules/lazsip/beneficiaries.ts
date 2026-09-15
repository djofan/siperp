import { prisma } from "@/lib/prisma";

// --- Admin (semua field, termasuk yang sensitif) ---

export async function listBeneficiariesForAdmin() {
  return prisma.lazsipBeneficiary.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getBeneficiaryForAdmin(id: string) {
  return prisma.lazsipBeneficiary.findUnique({ where: { id } });
}

interface BeneficiaryInput {
  name: string;
  address: string;
  problemFaced: string;
  birthDate: Date;
  age: number;
  gender: string;
  referralSource: string;
  photo?: string;
  needs: string;
  aidType: string;
  amountReceived: number;
  verifierName: string;
  verifierArea: string;
  maritalStatus: string;
}

export async function createBeneficiary(input: BeneficiaryInput) {
  return prisma.lazsipBeneficiary.create({ data: input });
}

export async function updateBeneficiary(id: string, input: BeneficiaryInput) {
  return prisma.lazsipBeneficiary.update({ where: { id }, data: input });
}

export async function deleteBeneficiary(id: string) {
  await prisma.lazsipBeneficiary.delete({ where: { id } });
}

// --- Publik (§7-CHECKPOINT: whitelist eksplisit, JANGAN tambah address/birthDate/maritalStatus) ---

const PUBLIC_CARD_SELECT = {
  id: true,
  name: true,
  amountReceived: true,
  aidType: true,
  photo: true,
} as const;

const PUBLIC_DETAIL_SELECT = {
  id: true,
  name: true,
  age: true,
  problemFaced: true,
  gender: true,
  photo: true,
  referralSource: true,
  needs: true,
  aidType: true,
  amountReceived: true,
  verifierName: true,
  verifierArea: true,
} as const;

export async function listBeneficiariesPublic(aidType?: string) {
  return prisma.lazsipBeneficiary.findMany({
    where: aidType ? { aidType } : undefined,
    orderBy: { createdAt: "desc" },
    select: PUBLIC_CARD_SELECT,
  });
}

export async function getBeneficiaryPublicById(id: string) {
  return prisma.lazsipBeneficiary.findUnique({ where: { id }, select: PUBLIC_DETAIL_SELECT });
}

export async function countBeneficiaries() {
  return prisma.lazsipBeneficiary.count();
}

export async function listDistinctVerifierAreas() {
  const rows = await prisma.lazsipBeneficiary.findMany({
    select: { verifierArea: true },
    distinct: ["verifierArea"],
  });
  return rows.map((r) => r.verifierArea).sort();
}

export async function countDistinctVerifiers() {
  const rows = await prisma.lazsipBeneficiary.findMany({
    select: { verifierName: true },
    distinct: ["verifierName"],
  });
  return rows.length;
}
