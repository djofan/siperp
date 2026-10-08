import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { TanwirError } from "./errors";
import { CODE_PREFIX, nextAvailableCode } from "./policy";

function groupInput(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const picId = String(form.get("picId") ?? "").trim();
  if (!name) throw new TanwirError("Nama kelompok wajib diisi.");
  if (name.length > 191 || description.length > 5000) throw new TanwirError("Isian terlalu panjang.");
  if (!picId) throw new TanwirError("PIC guru wajib dipilih.");
  return { name, description: description || null, picId };
}

async function assertGuru(picId: string) {
  const guru = await prisma.tanwirMember.findFirst({ where: { id: picId, role: "guru" }, select: { id: true } });
  if (!guru) throw new TanwirError("Guru PIC tidak ditemukan.");
}

/** Tugas buatan guru selalu terkirim ke kelompok yang di-PIC-inya (prd-tanwir §6.1). */
export async function syncTeacherTaskGroups(teacherId: string, tx: Prisma.TransactionClient = prisma) {
  const [tasks, groups] = await Promise.all([
    tx.tanwirTask.findMany({ where: { teacherId }, select: { id: true } }),
    tx.tanwirGroup.findMany({ where: { picId: teacherId }, select: { id: true } }),
  ]);
  for (const task of tasks) {
    await tx.tanwirTaskGroup.deleteMany({ where: { taskId: task.id } });
    if (groups.length) {
      await tx.tanwirTaskGroup.createMany({ data: groups.map((group) => ({ taskId: task.id, groupId: group.id })) });
    }
  }
}

export async function createGroup(form: FormData) {
  const input = groupInput(form);
  await assertGuru(input.picId);
  for (let attempt = 0; attempt < 3; attempt++) {
    const [count, taken] = await Promise.all([
      prisma.tanwirGroup.count(),
      prisma.tanwirGroup.findMany({ select: { code: true } }),
    ]);
    const code = nextAvailableCode(CODE_PREFIX.group, count, new Set(taken.map((row) => row.code)));
    try {
      return await prisma.$transaction(async (tx) => {
        const group = await tx.tanwirGroup.create({ data: { ...input, code }, select: { id: true } });
        await syncTeacherTaskGroups(input.picId, tx);
        return group;
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
  throw new TanwirError("Kode kelompok gagal dibuat. Coba lagi.");
}

export async function updateGroup(groupId: string, form: FormData) {
  const input = groupInput(form);
  await assertGuru(input.picId);
  const existing = await prisma.tanwirGroup.findUnique({ where: { id: groupId }, select: { picId: true } });
  if (!existing) throw new TanwirError("Kelompok tidak ditemukan.");
  await prisma.$transaction(async (tx) => {
    await tx.tanwirGroup.update({ where: { id: groupId }, data: input });
    // PIC berganti → tugas PIC lama berhenti terkirim, tugas PIC baru ikut terkirim.
    if (existing.picId && existing.picId !== input.picId) await syncTeacherTaskGroups(existing.picId, tx);
    await syncTeacherTaskGroups(input.picId, tx);
  });
}

export async function deleteGroup(groupId: string) {
  await prisma.tanwirGroup.delete({ where: { id: groupId } }).catch(() => {
    throw new TanwirError("Kelompok tidak ditemukan.");
  });
}

export async function listGroups() {
  return prisma.tanwirGroup.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      createdAt: true,
      pic: { select: { id: true, code: true, user: { select: { name: true } } } },
      _count: { select: { members: true, tasks: true } },
    },
  });
}

export async function getGroupDetail(groupId: string) {
  return prisma.tanwirGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      picId: true,
      pic: { select: { code: true, user: { select: { name: true } } } },
      members: {
        orderBy: { code: "asc" },
        select: { id: true, code: true, phone: true, teachingPlace: true, user: { select: { name: true, isActive: true } } },
      },
      _count: { select: { tasks: true } },
    },
  });
}

export async function groupOptions() {
  return prisma.tanwirGroup.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } });
}

export async function guruOptions() {
  return prisma.tanwirMember.findMany({
    where: { role: "guru" },
    orderBy: { code: "asc" },
    select: { id: true, code: true, user: { select: { name: true } } },
  });
}
