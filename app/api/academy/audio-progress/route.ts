import { prisma } from "@/lib/prisma";
import { authorizedLesson, sameOrigin } from "@/modules/academy/api/files";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.lessonId !== "string" || !Number.isFinite(body.position) || body.position < 0 || body.position > 86400) return Response.json({ error: "Posisi tidak valid." }, { status: 400 });
  const access = await authorizedLesson(body.lessonId);
  if (!access?.user.academyProfile || access.user.isTeacher || access.user.isSuperadmin || body.source !== access.lesson.videoUrl) return Response.json({ error: "Materi tidak tersedia." }, { status: 403 });
  const profileId = access.user.academyProfile.id;
  const data = { audioPosition: body.position, audioSource: access.lesson.videoUrl };
  await prisma.zakatAcademyLessonProgress.upsert({ where: { profileId_lessonId: { profileId, lessonId: body.lessonId } }, create: { profileId, lessonId: body.lessonId, ...data }, update: data });
  return Response.json({ ok: true });
}
