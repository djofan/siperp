import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { OjolError } from "./errors";
import { CODE_PREFIX, nextAvailableCode } from "./policy";

// Kelompok Ojol tidak punya PIC (prd-ojol §3) — guru memilih kelompok penerima per tugas.
function groupInput(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!name) throw new OjolError("Nama kelompok wajib diisi.");
  if (name.length > 191 || description.length > 5000) throw new OjolError("Isian terlalu panjang.");
  return { name, description: description || null };
}

export async function createGroup(form: FormData) {
  const input = groupInput(form);
  for (let attempt = 0; attempt < 3; attempt++) {
    const [count, taken] = await Promise.all([prisma.ojolGroup.count(), prisma.ojolGroup.findMany({ select: { code: true } })]);
    const code = nextAvailableCode(CODE_PREFIX.group, count, new Set(taken.map((row) => row.code)));
    try {
      return await prisma.ojolGroup.create({ data: { ...input, code }, select: { id: true } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
  throw new OjolError("Kode kelompok gagal dibuat. Coba lagi.");
}

export async function updateGroup(groupId: string, form: FormData) {
  const updated = await prisma.ojolGroup.updateMany({ where: { id: groupId }, data: groupInput(form) });
  if (updated.count === 0) throw new OjolError("Kelompok tidak ditemukan.");
}

export async function deleteGroup(groupId: string) {
  const deleted = await prisma.ojolGroup.deleteMany({ where: { id: groupId } });
  if (deleted.count === 0) throw new OjolError("Kelompok tidak ditemukan.");
}

export async function listGroups() {
  return prisma.ojolGroup.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, description: true, createdAt: true, _count: { select: { members: true, tasks: true } } },
  });
}

export async function getGroupDetail(groupId: string) {
  return prisma.ojolGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      members: {
        orderBy: { code: "asc" },
        select: { id: true, code: true, phone: true, user: { select: { name: true, isActive: true } } },
      },
      _count: { select: { tasks: true } },
    },
  });
}

export async function groupOptions() {
  return prisma.ojolGroup.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, _count: { select: { members: true } } },
  });
}

export async function guruOptions() {
  return prisma.ojolMember.findMany({
    where: { role: "guru" },
    orderBy: { code: "asc" },
    select: { id: true, code: true, user: { select: { name: true, isActive: true } } },
  });
}
