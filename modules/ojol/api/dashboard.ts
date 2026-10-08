import "server-only";
import { prisma } from "@/lib/prisma";

export async function adminSummary() {
  const [guru, peserta, groups, tasks, pending] = await Promise.all([
    prisma.ojolMember.count({ where: { role: "guru" } }),
    prisma.ojolMember.count({ where: { role: "peserta" } }),
    prisma.ojolGroup.count(),
    prisma.ojolTask.count(),
    prisma.ojolSubmission.count({ where: { status: "pending" } }),
  ]);
  return { guru, peserta, groups, tasks, pending };
}

/** Titik peta sebaran — hanya untuk dashboard admin (bukan publik): nama, peran, kota. */
export async function mapPoints() {
  const members = await prisma.ojolMember.findMany({
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
  return prisma.ojolMember.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, code: true, role: true, createdAt: true, user: { select: { name: true } } },
  });
}

/** Ringkasan guru: koreksi menunggu (milik sendiri + co-review), tugas dibuat, koreksi selesai, tugas aktif. */
export async function teacherSummary(teacherId: string) {
  const reviewScope = { OR: [{ teacherId }, { approvers: { some: { teacherId } } }] };
  const [pending, tasks, reviewed, activeTasks] = await Promise.all([
    prisma.ojolSubmission.count({ where: { status: "pending", task: { type: { not: "quiz" }, ...reviewScope } } }),
    prisma.ojolTask.count({ where: { teacherId } }),
    prisma.ojolSubmissionLog.count({ where: { reviewerId: teacherId } }),
    prisma.ojolTask.findMany({
      where: { ...reviewScope, deadline: { gt: new Date() } },
      orderBy: { deadline: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        type: true,
        deadline: true,
        teacherId: true,
        groups: { select: { group: { select: { name: true, _count: { select: { members: true } } } } } },
        _count: { select: { submissions: true } },
      },
    }),
  ]);
  return { pending, tasks, reviewed, activeTasks };
}

export async function studentGroupInfo(groupId: string | null) {
  if (!groupId) return null;
  return prisma.ojolGroup.findUnique({
    where: { id: groupId },
    select: { code: true, name: true, description: true, _count: { select: { members: true } } },
  });
}
