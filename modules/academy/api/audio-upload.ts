import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { detectMaterialFile, fileExtensions, uploadRoot } from "./files";
import { AcademyError } from "./errors";
// Call after authenticating the author and validating the chapter.
export async function prepareAudioUpload(form: FormData) {
  const file = form.get("audioFile");
  if (!(file instanceof File) || !file.size) return null;
  if (file.size > 50 * 1024 * 1024) throw new AcademyError("Audio maksimal 50 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = detectMaterialFile(bytes);
  if (!mime?.startsWith("audio/")) throw new AcademyError("Gunakan audio MP3, WAV, OGG, atau M4A.");
  const id = randomUUID();
  const fileUrl = "/api/academy/files/" + id;
  const diskPath = path.join(/* turbopackIgnore: true */ uploadRoot, id + "." + fileExtensions[mime]);
  const { mkdir, writeFile, unlink } = await import(/* turbopackIgnore: true */ "node:fs/promises");
  await mkdir(uploadRoot, { recursive: true });
  await writeFile(diskPath, bytes, { flag: "wx" });
  return { fileUrl, attachment: { id, fileUrl, title: file.name.slice(0, 191), fileType: mime, fileSize: file.size }, cleanup: () => unlink(diskPath) };
}
