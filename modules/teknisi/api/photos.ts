import "server-only";
import sharp from "sharp";
export async function readPhotos(form: FormData, required = true) {
  const files = form.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  if (required && !files.length) throw new Error("Tambahkan minimal satu foto tahap servis ini.");
  if (files.length > 3 || files.some(file => file.size > 5 * 1024 * 1024)) throw new Error("Maksimal 3 foto, masing-masing 5 MB.");
  return Promise.all(files.map(async file => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Foto harus JPEG, PNG, atau WebP.");
    const bytes=Buffer.from(await file.arrayBuffer());
    const valid=bytes.subarray(0,3).equals(Buffer.from([255,216,255]))||bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||(bytes.subarray(0,4).toString()==="RIFF"&&bytes.subarray(8,12).toString()==="WEBP");
    if(!valid)throw new Error("Isi file bukan foto JPEG, PNG, atau WebP.");
    try { return new Uint8Array(await sharp(bytes, { limitInputPixels: 24000000 }).rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()); }
    catch { throw new Error("Foto tidak valid atau terlalu besar untuk diproses."); }
  }));
}
