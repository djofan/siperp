import "server-only";
import bcrypt from "bcryptjs";
import { after } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { OjolError } from "./errors";
import type { OjolMemberRole } from "./access";
import { CODE_PREFIX, MAX_PHOTO_BYTES, nextAvailableCode, placeholderEmail } from "./policy";
import { deleteUpload, readUpload, saveUpload } from "./files";
import { geocodeMember } from "./wilayah";

const MIN_PASSWORD = 8;

function text(form: FormData, key: string, max = 191): string {
  const raw = form.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length > max) throw new OjolError("Isian terlalu panjang.");
  return value;
}
const optional = (value: string) => (value === "" ? null : value);

export interface AddressInput {
  address: string | null;
  provinceId: string | null;
  provinceName: string | null;
  cityId: string | null;
  cityName: string | null;
  districtId: string | null;
  districtName: string | null;
  villageId: string | null;
  villageName: string | null;
}

export function addressInput(form: FormData): AddressInput {
  return {
    address: optional(text(form, "address", 1000)),
    provinceId: optional(text(form, "provinceId", 20)),
    provinceName: optional(text(form, "provinceName")),
    cityId: optional(text(form, "cityId", 20)),
    cityName: optional(text(form, "cityName")),
    districtId: optional(text(form, "districtId", 20)),
    districtName: optional(text(form, "districtName")),
    villageId: optional(text(form, "villageId", 20)),
    villageName: optional(text(form, "villageName")),
  };
}

function profileInput(form: FormData) {
  const gender = text(form, "gender");
  if (gender && gender !== "laki_laki" && gender !== "perempuan") throw new OjolError("Jenis kelamin tidak valid.");
  const phone = text(form, "phone", 20);
  if (phone && !/^[+\d][\d\s-]{6,19}$/.test(phone)) throw new OjolError("Nomor HP tidak valid.");
  return {
    phone: optional(phone),
    gender: gender ? (gender as "laki_laki" | "perempuan") : null,
    ...addressInput(form),
  };
}

function emailInput(form: FormData): string | null {
  const email = text(form, "email").toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new OjolError("Format email tidak valid.");
  if (email.endsWith(".invalid")) throw new OjolError("Gunakan email yang aktif, atau kosongkan.");
  return email;
}

function passwordInput(form: FormData, required: boolean): string | null {
  const raw = form.get("password");
  const password = typeof raw === "string" ? raw : "";
  if (!password) {
    if (required) throw new OjolError("Password wajib diisi.");
    return null;
  }
  if (password.length < MIN_PASSWORD) throw new OjolError(`Password minimal ${MIN_PASSWORD} karakter.`);
  if (password.length > 72) throw new OjolError("Password terlalu panjang.");
  return password;
}

async function groupIdInput(form: FormData, role: OjolMemberRole): Promise<string | null> {
  if (role !== "peserta") return null;
  const groupId = text(form, "groupId", 40);
  if (!groupId) return null;
  const group = await prisma.ojolGroup.findUnique({ where: { id: groupId }, select: { id: true } });
  if (!group) throw new OjolError("Kelompok tidak ditemukan.");
  return group.id;
}

function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta ?? {}).includes(field)
  );
}

async function generateMemberCode(role: OjolMemberRole): Promise<string> {
  const prefix = CODE_PREFIX[role];
  const [count, taken] = await Promise.all([
    prisma.ojolMember.count({ where: { role } }),
    prisma.ojolMember.findMany({ where: { code: { startsWith: prefix } }, select: { code: true } }),
  ]);
  return nextAvailableCode(prefix, count, new Set(taken.map((row) => row.code)));
}

/** Admin membuat akun guru/peserta: akun Core + profil Ojol dengan kode akun otomatis. */
export async function createMember(role: OjolMemberRole, form: FormData): Promise<{ id: string; code: string }> {
  const name = text(form, "name");
  if (!name) throw new OjolError("Nama wajib diisi.");
  const email = emailInput(form);
  const password = passwordInput(form, true)!;
  const isActive = form.get("isActive") === "on";
  const profile = profileInput(form);
  const groupId = await groupIdInput(form, role);
  const passwordHash = await bcrypt.hash(password, 12);

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = await generateMemberCode(role);
    try {
      const member = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name, email: email ?? placeholderEmail(code), passwordHash, isActive },
          select: { id: true },
        });
        return tx.ojolMember.create({
          data: { userId: user.id, code, role, groupId, ...profile },
          select: { id: true, code: true },
        });
      });
      if (profile.provinceName) after(() => geocodeMember(member.id));
      return member;
    } catch (error) {
      if (isUniqueViolation(error, "email")) throw new OjolError("Email sudah dipakai akun lain.");
      if (!isUniqueViolation(error, "code")) throw error;
      // Kode bentrok karena dibuat bersamaan — coba kode berikutnya.
    }
  }
  throw new OjolError("Kode akun gagal dibuat. Coba lagi.");
}

function wilayahChanged(before: { villageId: string | null; provinceId: string | null }, after: AddressInput) {
  return before.villageId !== after.villageId || before.provinceId !== after.provinceId;
}

/** Admin mengubah akun guru/peserta. Password kosong = tidak diganti. */
export async function updateMember(memberId: string, role: OjolMemberRole, form: FormData): Promise<void> {
  const existing = await prisma.ojolMember.findFirst({
    where: { id: memberId, role },
    select: { id: true, code: true, userId: true, villageId: true, provinceId: true },
  });
  if (!existing) throw new OjolError("Akun tidak ditemukan.");
  const name = text(form, "name");
  if (!name) throw new OjolError("Nama wajib diisi.");
  const email = emailInput(form);
  const password = passwordInput(form, false);
  const isActive = form.get("isActive") === "on";
  const profile = profileInput(form);
  const groupId = await groupIdInput(form, role);
  const changed = wilayahChanged(existing, profile);

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.userId },
        data: {
          name,
          email: email ?? placeholderEmail(existing.code),
          isActive,
          ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        },
      }),
      prisma.ojolMember.update({
        where: { id: existing.id },
        data: { ...profile, groupId, ...(changed ? { latitude: null, longitude: null } : {}) },
      }),
    ]);
  } catch (error) {
    if (isUniqueViolation(error, "email")) throw new OjolError("Email sudah dipakai akun lain.");
    throw error;
  }
  if (changed && profile.provinceName) after(() => geocodeMember(existing.id));
}

export async function setMemberActive(memberId: string, isActive: boolean): Promise<void> {
  const member = await prisma.ojolMember.findUnique({ where: { id: memberId }, select: { userId: true } });
  if (!member) throw new OjolError("Akun tidak ditemukan.");
  await prisma.user.update({ where: { id: member.userId }, data: { isActive } });
}

/** Hapus akun. Tugas guru tetap ada (pembuat jadi kosong), setoran peserta ikut terhapus beserta filenya. */
export async function deleteMember(memberId: string, role: OjolMemberRole): Promise<void> {
  const member = await prisma.ojolMember.findFirst({
    where: { id: memberId, role },
    select: { userId: true, photo: true, submissions: { select: { filePath: true } } },
  });
  if (!member) throw new OjolError("Akun tidak ditemukan.");
  const user = await prisma.user.findUnique({ where: { id: member.userId }, select: { isSuperadmin: true, moduleAccess: { select: { id: true } } } });
  // Akun yang juga dipakai di modul lain / superadmin tidak dihapus dari sini.
  if (user?.isSuperadmin || (user?.moduleAccess.length ?? 0) > 0) {
    await prisma.ojolMember.delete({ where: { id: memberId } });
  } else {
    await prisma.user.delete({ where: { id: member.userId } });
  }
  await Promise.all([deleteUpload(member.photo), ...member.submissions.map((row) => deleteUpload(row.filePath))]);
}

/** Pengguna mengubah profilnya sendiri (tanpa kelompok & status). */
export async function updateOwnProfile(memberId: string, form: FormData): Promise<void> {
  const member = await prisma.ojolMember.findUnique({
    where: { id: memberId },
    select: { id: true, code: true, role: true, userId: true, photo: true, villageId: true, provinceId: true },
  });
  if (!member) throw new OjolError("Profil tidak ditemukan.");
  const name = text(form, "name");
  if (!name) throw new OjolError("Nama wajib diisi.");
  const email = emailInput(form);
  const profile = profileInput(form);
  const changed = wilayahChanged(member, profile);

  let photo: string | undefined;
  const upload = form.get("photo");
  if (upload instanceof File && upload.size > 0) {
    const { bytes, detected } = await readUpload(upload, MAX_PHOTO_BYTES);
    if (detected.kind !== "image") throw new OjolError("Foto harus JPG, PNG, atau WEBP.");
    photo = await saveUpload(`photos/${member.id}`, bytes, detected.ext);
  }

  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: member.userId }, data: { name, email: email ?? placeholderEmail(member.code) } }),
      prisma.ojolMember.update({
        where: { id: member.id },
        data: { ...profile, ...(photo ? { photo } : {}), ...(changed ? { latitude: null, longitude: null } : {}) },
      }),
    ]);
  } catch (error) {
    if (photo) await deleteUpload(photo);
    if (isUniqueViolation(error, "email")) throw new OjolError("Email sudah dipakai akun lain.");
    throw error;
  }
  if (photo) await deleteUpload(member.photo);
  if (changed && profile.provinceName) after(() => geocodeMember(member.id));
}

export async function changeOwnPassword(userId: string, form: FormData): Promise<void> {
  const current = form.get("currentPassword");
  if (typeof current !== "string" || !current) throw new OjolError("Password lama wajib diisi.");
  const next = passwordInput(form, true)!;
  if (form.get("passwordConfirm") !== next) throw new OjolError("Konfirmasi password tidak sama.");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) throw new OjolError("Password lama salah.");
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(next, 12) } });
}

// Field profil yang aman ditampilkan di app (bukan halaman publik).
export const memberListSelect = {
  id: true,
  code: true,
  role: true,
  phone: true,
  gender: true,
  photo: true,
  cityName: true,
  provinceName: true,
  createdAt: true,
  user: { select: { name: true, email: true, isActive: true } },
} satisfies Prisma.OjolMemberSelect;

export async function listMembers(role: OjolMemberRole, search = "") {
  const q = search.trim();
  return prisma.ojolMember.findMany({
    where: {
      role,
      ...(q ? { OR: [{ code: { contains: q } }, { user: { name: { contains: q } } }, { phone: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      ...memberListSelect,
      group: { select: { id: true, name: true, code: true } },
      _count: { select: { tasks: true, submissions: true } },
    },
  });
}

export async function getMemberForEdit(memberId: string, role: OjolMemberRole) {
  return prisma.ojolMember.findFirst({
    where: { id: memberId, role },
    include: { user: { select: { name: true, email: true, isActive: true } } },
  });
}
