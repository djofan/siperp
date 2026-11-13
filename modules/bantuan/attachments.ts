export const attachmentAccept = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.rtf";
export const attachmentLimit = 10 * 1024 * 1024;
export const attachmentHint = "Foto, PDF, Word, Excel, PowerPoint, ODT/ODS, TXT, CSV, RTF · maks. 10 MB per berkas";
export const isPhoto = (mime?: string) => !!mime?.startsWith("image/");
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
  if (!/\.(jpe?g|png|webp|heic|heif|pdf|docx?|xlsx?|pptx?|odt|ods|txt|csv|rtf)$/i.test(file.name)) {
    throw new Error(`${file.name}: format belum didukung. Gunakan foto, PDF, Word, Excel, PowerPoint, ODT/ODS, TXT, CSV, atau RTF.`);
  }
}
