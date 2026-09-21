import { isEntryKind } from "./data";

export function parseEntry(body: Record<string, unknown>) {
  if (typeof body.kind !== "string" || !isEntryKind(body.kind)) throw new Error("Jenis konten tidak valid.");
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!title || title.length > 191 || !description || description.length > 50000) throw new Error("Judul dan deskripsi wajib diisi (judul maksimal 191 karakter).");
  if (!["draft", "published", "completed", "archived"].includes(String(body.status))) throw new Error("Status tidak valid.");
  const location = typeof body.location === "string" ? body.location.trim() : "";
  if (location.length > 191) throw new Error("Lokasi maksimal 191 karakter.");
  const image = typeof body.image === "string" ? body.image.trim() : "";
  const uploadedImage = /^\/uploads\/sarsip\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(image);
  // Keep existing external images readable/editable while new images use file uploads.
  if (image && ((!uploadedImage && !/^https?:\/\//.test(image)) || image.length > 191)) throw new Error("Gambar tidak valid. Silakan unggah ulang file gambar.");
  const eventDate = body.eventDate ? new Date(String(body.eventDate)) : null;
  if (eventDate && Number.isNaN(eventDate.getTime())) throw new Error("Tanggal tidak valid.");
  const targetAmount = body.kind === "campaign" ? Number(body.targetAmount) : 0;
  if (!Number.isSafeInteger(targetAmount) || targetAmount < 0 || targetAmount > 2147483647 || (body.kind === "campaign" && targetAmount === 0)) throw new Error("Target campaign harus lebih dari Rp0 dan maksimal Rp2.147.483.647.");
  return { kind: body.kind, title, description, location: location || null, image: image || null, eventDate, targetAmount, status: String(body.status) };
}
