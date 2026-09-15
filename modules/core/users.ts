import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/modules/core/activity";

export async function countUsers() {
  return prisma.user.count();
}

export async function listUsersWithAccess() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperadmin: true,
      isActive: true,
      createdAt: true,
      moduleAccess: {
        select: {
          id: true,
          role: true,
          module: { select: { id: true, slug: true, name: true } },
        },
      },
    },
  });
}

export async function getUserWithAccess(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperadmin: true,
      isActive: true,
      moduleAccess: {
        select: { role: true, module: { select: { id: true, name: true } } },
      },
    },
  });
}

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  isSuperadmin: boolean;
  moduleIds: string[];
}

export async function createUserWithAccess(input: CreateUserInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const modules = input.moduleIds.length
    ? await prisma.module.findMany({
        where: { id: { in: input.moduleIds } },
        select: { id: true, name: true },
      })
    : [];

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      isSuperadmin: input.isSuperadmin,
      moduleAccess: {
        create: modules.map((module) => ({ moduleId: module.id })),
      },
    },
  });

  await logActivity(`Akun ${user.name} dibuat${input.isSuperadmin ? " sebagai superadmin" : ""}`);
  for (const mod of modules) {
    await logActivity(`${user.name} diberi akses ke ${mod.name}`);
  }

  return user;
}

interface ModuleAccessEntry {
  moduleId: string;
  role: string;
}

export async function setUserModuleAccess(userId: string, entries: ModuleAccessEntry[]) {
  const [user, currentAccess, modules] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    prisma.moduleAccess.findMany({
      where: { userId },
      select: { moduleId: true, role: true },
    }),
    prisma.module.findMany({
      where: { id: { in: entries.map((entry) => entry.moduleId) } },
      select: { id: true, name: true },
    }),
  ]);

  const moduleNameById = new Map(modules.map((module) => [module.id, module.name]));
  const currentByModuleId = new Map(currentAccess.map((access) => [access.moduleId, access.role]));
  const nextModuleIds = new Set(entries.map((entry) => entry.moduleId));

  const granted = entries.filter((entry) => !currentByModuleId.has(entry.moduleId));
  const revoked = currentAccess.filter((access) => !nextModuleIds.has(access.moduleId));
  const roleChanged = entries.filter((entry) => {
    const currentRole = currentByModuleId.get(entry.moduleId);
    return currentRole !== undefined && currentRole !== entry.role;
  });

  await prisma.$transaction([
    prisma.moduleAccess.deleteMany({ where: { userId } }),
    prisma.moduleAccess.createMany({
      data: entries.map((entry) => ({ userId, moduleId: entry.moduleId, role: entry.role })),
    }),
  ]);

  for (const entry of granted) {
    const moduleName = moduleNameById.get(entry.moduleId) ?? entry.moduleId;
    await logActivity(`${user.name} diberi akses ke ${moduleName}`);
  }
  for (const access of revoked) {
    const moduleName = moduleNameById.get(access.moduleId) ?? access.moduleId;
    await logActivity(`Akses ${user.name} ke ${moduleName} dicabut`);
  }
  for (const entry of roleChanged) {
    const moduleName = moduleNameById.get(entry.moduleId) ?? entry.moduleId;
    await logActivity(`Role ${user.name} di ${moduleName} diubah jadi ${entry.role}`);
  }
}

export async function setUserActive(userId: string, isActive: boolean) {
  if (!isActive) {
    const target = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isSuperadmin: true },
    });
    if (target.isSuperadmin) {
      const activeSuperadmins = await prisma.user.count({
        where: { isSuperadmin: true, isActive: true },
      });
      if (activeSuperadmins <= 1) {
        throw new Error("Tidak bisa menonaktifkan satu-satunya superadmin yang masih aktif.");
      }
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { name: true },
  });

  await logActivity(`Akun ${user.name} ${isActive ? "diaktifkan" : "dinonaktifkan"}`);
}

export async function countSuperadmins() {
  return prisma.user.count({ where: { isSuperadmin: true } });
}

interface UpdateUserInput {
  name: string;
  email: string;
  password?: string;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  await logActivity(
    `Data akun ${user.name} diperbarui${passwordHash ? " (termasuk password)" : ""}`
  );

  return user;
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { name: true, isSuperadmin: true },
  });

  if (user.isSuperadmin) {
    const superadminCount = await countSuperadmins();
    if (superadminCount <= 1) {
      throw new Error("Tidak bisa menghapus satu-satunya akun superadmin.");
    }
  }

  await prisma.user.delete({ where: { id } });
  await logActivity(`Akun ${user.name} dihapus`);
}
