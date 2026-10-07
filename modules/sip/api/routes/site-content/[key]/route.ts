import { NextResponse } from "next/server";
import { getSipAdmin } from "@/modules/sip/api/admin-access";
import { SIP_SITE_CONTENT_KEYS, splitLines, upsertSiteContent, type SipSiteContentSectionKey } from "@/modules/sip/api/siteContent";

const VALID_KEYS = SIP_SITE_CONTENT_KEYS;

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const admin = await getSipAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { key } = await params;
  if (!VALID_KEYS.includes(key as SipSiteContentSectionKey)) {
    return NextResponse.json({ error: "Section tidak dikenal." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.content !== "object" || body.content === null) {
    return NextResponse.json({ error: "content wajib diisi." }, { status: 400 });
  }

  const content: Record<string, string> = {};
  for (const [field, value] of Object.entries(body.content as Record<string, unknown>)) {
    if (typeof value === "string") content[field] = value;
  }

  if (key === "layanan" && splitLines(content.faq).some(line => {
    const separator = line.indexOf("|");
    return separator < 1 || !line.slice(separator+1).trim();
  })) {
    return NextResponse.json({ error: "Format FAQ: satu pasangan Pertanyaan | Jawaban per baris." }, { status: 400 });
  }
  await upsertSiteContent(key as SipSiteContentSectionKey, content);
  return NextResponse.json({ ok: true });
}
