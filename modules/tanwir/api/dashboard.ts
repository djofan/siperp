import "server-only";
import { prisma } from "@/lib/prisma";

export async function adminSummary() {
  const [guru, peserta, groups, tasks, pending, students] = await Promise.all([
    prisma.tanwirMember.count({ where: { role: "guru" } }),
    prisma.tanwirMember.count({ where: { role: "peserta" } }),
    prisma.tanwirGroup.count(),
    prisma.tanwirTask.count(),
    prisma.tanwirSubmission.count({ where: { status: "pending" } }),
    prisma.tanwirStudent.count(),
  ]);
  return { guru, peserta, groups, tasks, pending, students };
}

/** Titik peta sebaran — hanya untuk dashboard admin (bukan publik): nama, peran, kota. */
export async function mapPoints() {
  const members = await prisma.tanwirMember.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { role: true, latitude: true, longitude: true, cityName: true, provinceName: true, user: { select: { name: true } } },
  });
  return members.map((member) => ({
    name: member.user.name,
    role: member.role,
    place: [member.cityName, member.provinceName].filter(Boolean).join(", "),
    lat: Number(member.latitude),
    lng: Number(member.longitude),
  }));
}

export async function recentMembers(limit = 6) {
  return prisma.tanwirMember.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, code: true, role: true, createdAt: true, user: { select: { name: true } } },
  });
}

export async function teacherSummary(teacherId: string) {
  const [pending, tasks, groups] = await Promise.all([
    prisma.tanwirSubmission.count({ where: { status: "pending", task: { teacherId, type: { not: "quiz" } } } }),
    prisma.tanwirTask.count({ where: { teacherId } }),
    prisma.tanwirGroup.findMany({
      where: { picId: teacherId },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        members: {
          orderBy: { code: "asc" },
          select: { id: true, code: true, teachingPlace: true, phone: true, user: { select: { name: true, isActive: true } }, _count: { select: { submissions: true, students: true } } },
        },
      },
    }),
  ]);
  const reviewed = await prisma.tanwirSubmissionLog.count({ where: { reviewerId: teacherId } });
  return { pending, tasks, reviewed, groups };
}

export async function studentGroupInfo(groupId: string | null) {
  if (!groupId) return null;
  return prisma.tanwirGroup.findUnique({
    where: { id: groupId },
    select: { code: true, name: true, description: true, pic: { select: { phone: true, user: { select: { name: true } } } }, _count: { select: { members: true } } },
  });
}
