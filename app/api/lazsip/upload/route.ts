import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getSession, hasModuleAccess } from "@/lib/auth";

/**
 * Upload gambar admin LAZSIP — SEMENTARA disimpan di disk lokal (public/uploads/lazsip/).
 * docs/prd-lazsip.md §7 minta storage yang konsisten dengan strategi platform (bukan disk
 * lokal server) untuk production — ini provisional sampai provider storage diputuskan,
 * sama seperti payment gateway yang masih mode simulasi. Ganti isi handler ini saja
 * (endpoint & kontrak return { url } tetap sama) begitu providernya dipilih.
 */
const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!hasModuleAccess(session, "lazsip")) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File wajib diisi." }, { status: 400 });
  }

  const extension = ACCEPTED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Format tidak didukung. Gunakan JPG, PNG, atau WEBP." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Ukuran file maksimal 2MB." }, { status: 400 });
  }

  const filename = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "lazsip");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/lazsip/${filename}` }, { status: 201 });
}
