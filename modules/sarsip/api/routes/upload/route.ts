import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getSession, hasModuleAccess } from "@/lib/auth";

// Local storage follows SIP/LAZSIP during development; production needs persistent storage.
export async function POST(request: Request) {
  if (!hasModuleAccess(await getSession(), "sarsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }
  const data = await request.formData().catch(() => null);
  const file = data?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Pilih file gambar terlebih dahulu." }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran gambar maksimal 2 MB." }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.type === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "png"
    : file.type === "image/jpeg" && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 ? "jpg"
    : file.type === "image/webp" && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
  if (!extension) {
    return NextResponse.json({ error: "File harus berupa gambar JPG, PNG, atau WebP yang valid." }, { status: 400 });
  }
  const filename = `${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "sarsip");
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), buffer, { flag: "wx" });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan gambar. Silakan coba lagi." }, { status: 500 });
  }
  return NextResponse.json({ url: `/uploads/sarsip/${filename}` }, { status: 201 });
}
