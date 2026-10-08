import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertOjolMember, errorMessage } from "@/modules/ojol/api/access";
import { submitMedia } from "@/modules/ojol/api/submissions";
import { isSameOrigin } from "@/modules/ojol/api/files";

export const runtime = "nodejs";

// Unggah setoran voice note/video (multipart). Lewat route handler, bukan server action,
// karena ukuran file bisa sampai 50 MB (prd-ojol §9).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }
  try {
    const viewer = await assertOjolMember("peserta");
    const form = await request.formData();
    const taskId = form.get("taskId");
    const file = form.get("file");
    if (typeof taskId !== "string" || !(file instanceof File)) {
      return NextResponse.json({ error: "Pilih atau rekam file terlebih dahulu." }, { status: 400 });
    }
    const result = await submitMedia(taskId, viewer.member, file);
    revalidatePath("/ojol", "layout");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Setoran gagal dikirim. Coba lagi.") }, { status: 400 });
  }
}
