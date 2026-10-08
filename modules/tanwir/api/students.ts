import "server-only";
import { prisma } from "@/lib/prisma";
import { TanwirError } from "./errors";

// Anak didik = santri yang dicatat peserta. Data privat (kontak orang tua) — hanya untuk
// peserta pemilik, guru PIC kelompoknya, dan admin (prd-tanwir §6.11–6.12).

export type StudentScope =
  | { kind: "peserta"; memberId: string }
  | { kind: "guru"; teacherId: string }
  | { kind: "admin" };

function scopeWhere(scope: StudentScope) {
  if (scope.kind === "peserta") return { memberId: scope.memberId };
  if (scope.kind === "guru") return { member: { group: { picId: scope.teacherId } } };
  return {};
}

function studentInput(form: FormData) {
  const field = (key: string, max = 191) => {
    const value = String(form.get(key) ?? "").trim();
    if (value.length > max) throw new TanwirError("Isian terlalu panjang.");
    return value;
  };
  const name = field("name");
  if (!name) throw new TanwirError("Nama anak wajib diisi.");
  const ageRaw = field("age", 3);
  const age = ageRaw ? Number(ageRaw) : null;
  if (age !== null && (!Number.isInteger(age) || age < 1 || age > 99)) throw new TanwirError("Usia harus angka 1–99.");
  const parentPhone = field("parentPhone", 20);
  if (parentPhone && !/^[+\d][\d\s-]{6,19}$/.test(parentPhone)) throw new TanwirError("Nomor HP orang tua tidak valid.");
  return {
    name,
    age,
    className: field("className") || null,
    parentName: field("parentName") || null,
    parentPhone: parentPhone || null,
    progress: field("progress", 5000) || null,
  };
}

/** Peserta pemilik santri: peserta sendiri, atau dipilih guru/admin dari peserta dalam lingkupnya. */
async function resolveOwner(scope: StudentScope, form: FormData): Promise<string> {
  if (scope.kind === "peserta") return scope.memberId;
  const memberId = String(form.get("memberId") ?? "");
  const owner = await prisma.tanwirMember.findFirst({
    where: { id: memberId, role: "peserta", ...(scope.kind === "guru" ? { group: { picId: scope.teacherId } } : {}) },
    select: { id: true },
  });
  if (!owner) throw new TanwirError("Pilih peserta (guru ngaji) yang valid.");
  return owner.id;
}

export async function saveStudent(scope: StudentScope, studentId: string | null, form: FormData) {
  const data = studentInput(form);
  const memberId = await resolveOwner(scope, form);
  if (studentId) {
    const updated = await prisma.tanwirStudent.updateMany({ where: { id: studentId, ...scopeWhere(scope) }, data: { ...data, memberId } });
    if (updated.count === 0) throw new TanwirError("Data anak didik tidak ditemukan.");
    return;
  }
  await prisma.tanwirStudent.create({ data: { ...data, memberId } });
}

export async function deleteStudent(scope: StudentScope, studentId: string) {
  const deleted = await prisma.tanwirStudent.deleteMany({ where: { id: studentId, ...scopeWhere(scope) } });
  if (deleted.count === 0) throw new TanwirError("Data anak didik tidak ditemukan.");
}

export async function listStudents(scope: StudentScope, search = "") {
  const q = search.trim();
  return prisma.tanwirStudent.findMany({
    where: { ...scopeWhere(scope), ...(q ? { OR: [{ name: { contains: q } }, { parentName: { contains: q } }] } : {}) },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      age: true,
      className: true,
      parentName: true,
      parentPhone: true,
      progress: true,
      updatedAt: true,
      member: { select: { id: true, code: true, teachingPlace: true, user: { select: { name: true } }, group: { select: { name: true } } } },
    },
  });
}

export async function getStudent(scope: StudentScope, studentId: string) {
  return prisma.tanwirStudent.findFirst({ where: { id: studentId, ...scopeWhere(scope) } });
}

/** Peserta yang boleh dipilih sebagai pemilik santri (guru: peserta di kelompok yang di-PIC-i). */
export async function ownerOptions(scope: StudentScope) {
  if (scope.kind === "peserta") return [];
  return prisma.tanwirMember.findMany({
    where: { role: "peserta", ...(scope.kind === "guru" ? { group: { picId: scope.teacherId } } : {}) },
    orderBy: { code: "asc" },
    select: { id: true, code: true, user: { select: { name: true } } },
  });
}
