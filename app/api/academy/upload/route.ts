import { randomUUID } from "node:crypto";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorizedLesson, detectMaterialFile, fileExtensions, uploadRoot, sameOrigin } from "@/modules/academy/api/files";
export const runtime = "nodejs";
export async function POST(request: Request) {
  // Runtime uploads must not be treated as files bundled during compilation.
  const { mkdir, writeFile, unlink } = await import(/* turbopackIgnore: true */ "node:fs/promises");
  if (!sameOrigin(request)) return Response.json({ error: "Permintaan tidak valid." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 51 * 1024 * 1024) return Response.json({ error: "File terlalu besar." }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const lessonId = String(form?.get("lessonId") ?? "");
  if (!await authorizedLesson(lessonId, true)) return Response.json({ error: "Akses pengajar diperlukan." }, { status: 403 });
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size || file.size > 50 * 1024 * 1024) return Response.json({ error: "Pilih audio maksimal 50 MB atau PDF maksimal 10 MB." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = detectMaterialFile(bytes);
  if (!mime || mime === "application/pdf" && file.size > 10 * 1024 * 1024) return Response.json({ error: "Format tidak didukung. Gunakan MP3, WAV, OGG, M4A, atau PDF." }, { status: 400 });
  const id = randomUUID(), fileUrl = `/api/academy/files/${id}`, diskPath = path.join(/* turbopackIgnore: true */ uploadRoot, `${id}.${fileExtensions[mime]}`);
  await mkdir(uploadRoot, { recursive: true });
  await writeFile(diskPath, bytes, { flag: "wx" });
  try {
    await prisma.$transaction(async tx => {
      await tx.zakatAcademyLessonAttachment.create({ data: { id, lessonId, title: file.name.slice(0,191), fileUrl, fileType: mime, fileSize: file.size } });
      if (mime.startsWith("audio/")) await tx.zakatAcademyLesson.update({ where: { id: lessonId }, data: { videoProvider: "AUDIO", videoUrl: fileUrl } });
    });
  } catch { await unlink(diskPath); return Response.json({ error: "File gagal disimpan." }, { status: 500 }); }
  revalidatePath("/academy", "layout");
  return Response.json({ fileUrl, isAudio: mime.startsWith("audio/"), message: mime === "application/pdf" ? "PDF ditambahkan sebagai lampiran." : "Audio tersimpan sebagai sumber materi." });
}
