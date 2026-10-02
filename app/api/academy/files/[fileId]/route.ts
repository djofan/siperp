import { Readable } from "node:stream";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { authorizedLesson, fileExtensions, uploadRoot } from "@/modules/academy/api/files";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { stat } = await import(/* turbopackIgnore: true */ "node:fs/promises");
  const { createReadStream } = await import(/* turbopackIgnore: true */ "node:fs");
  const { fileId } = await params;
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(fileId)) return new Response(null, { status: 404 });
  const file = await prisma.zakatAcademyLessonAttachment.findUnique({ where: { id: fileId } });
  if (!file || !file.fileType || !fileExtensions[file.fileType] || !await authorizedLesson(file.lessonId)) return new Response(null, { status: 404 });
  const diskPath = path.join(/* turbopackIgnore: true */ uploadRoot, `${file.id}.${fileExtensions[file.fileType]}`);
  const info = await stat(diskPath).catch(() => null);
  if (!info) return new Response(null, { status: 404 });
  const range = request.headers.get("range");
  let start = 0, end = info.size - 1;
  if (range) {
    const parsed = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!parsed || !parsed[1] && !parsed[2]) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    if (!parsed[1]) start = Math.max(0, info.size - Number(parsed[2]));
    else { start = Number(parsed[1]); if (parsed[2]) end = Math.min(end, Number(parsed[2])); }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
  }
  const headers: Record<string,string> = { "Content-Type": file.fileType, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": `${file.fileType === "application/pdf" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.title)}` };
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
  return new Response(Readable.toWeb(createReadStream(diskPath, { start, end })) as ReadableStream, { status: range ? 206 : 200, headers });
}
