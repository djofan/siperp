export const attachmentAccept = "";
export const attachmentLimit = 10 * 1024 * 1024;
export const attachmentHint = "Semua format berkas · maks. 10 MB per berkas";
export const isPhoto = (mime?: string) => ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/avif", "image/heic", "image/heif"].includes(mime ?? "");
export function attachmentType(mime?: string) {
  if (isPhoto(mime)) return "Foto";
  if (mime === "application/pdf") return "PDF";
  if (/word|wordprocessing|opendocument.text/.test(mime ?? "")) return "Word / dokumen";
  if (/excel|spreadsheet|csv/.test(mime ?? "")) return "Spreadsheet";
  if (/powerpoint|presentation/.test(mime ?? "")) return "Presentasi";
  return "Dokumen";
}
export function validateAttachment(file: File) {
  if (!file.size) throw new Error(`${file.name}: berkas kosong.`);
  if (file.size > attachmentLimit) throw new Error(`${file.name}: ukuran maksimal 10 MB per berkas.`);
}
