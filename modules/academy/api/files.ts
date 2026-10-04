import "server-only";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getAcademyUser, getAcademyAvailability } from "./access";
import { lessonReleased } from "./policy";
export const uploadRoot = path.resolve(/* turbopackIgnore: true */ process.env.ACADEMY_UPLOAD_DIR ?? ".academy-uploads");
export const fileExtensions: Record<string, string> = { "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg", "audio/mp4": "m4a", "application/pdf": "pdf" };
export function detectMaterialFile(bytes: Buffer): string | null {
  if (bytes.subarray(0,5).toString() === "%PDF-") return "application/pdf";
  if (bytes.subarray(0,4).toString() === "RIFF" && bytes.subarray(8,12).toString() === "WAVE") return "audio/wav";
  if (bytes.subarray(0,4).toString() === "OggS") return "audio/ogg";
  if (bytes.subarray(4,8).toString() === "ftyp" && ["M4A ","M4B "].includes(bytes.subarray(8,12).toString())) return "audio/mp4";
  if (bytes.subarray(0,3).toString() === "ID3" || bytes.length > 1 && bytes[0] === 255 && (bytes[1] & 224) === 224) return "audio/mpeg";
  return null;
}
export async function authorizedLesson(lessonId: string, teachingOnly = false) {
  const user = await getAcademyUser();
  if (!user || !await getAcademyAvailability()) return null;
  const lesson = await prisma.zakatAcademyLesson.findUnique({ where: { id: lessonId }, select: { id: true, isPublished: true, releaseDay: true, videoUrl: true, chapter: { select: { isPublished: true, course: { select: { id: true, isPublished: true, startsAt: true } } } } } });
  if (!lesson) return null;
  if (user.isTeacher || user.isSuperadmin) return { user, lesson };
  if (teachingOnly || !user.academyProfile || user.academyProfile.mustChangePassword || !lesson.isPublished || !lesson.chapter.isPublished || !lesson.chapter.course.isPublished || !lessonReleased(lesson.chapter.course.startsAt, lesson.releaseDay)) return null;
  const enrolled = await prisma.zakatAcademyEnrollment.findUnique({ where: { profileId_courseId: { profileId: user.academyProfile.id, courseId: lesson.chapter.course.id } }, select: { id: true } });
  return enrolled ? { user, lesson } : null;
}
export function sameOrigin(request: Request) { return request.headers.get("origin") === new URL(request.url).origin; }
