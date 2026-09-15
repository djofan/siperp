import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

export async function authenticate(
  email: string,
  password: string
): Promise<SessionPayload | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { moduleAccess: { include: { module: true } } },
  });

  if (!user || !user.isActive) return null;

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) return null;

  return {
    userId: user.id,
    name: user.name,
    isSuperadmin: user.isSuperadmin,
    moduleSlugs: user.moduleAccess.map((access) => access.module.slug),
  };
}
