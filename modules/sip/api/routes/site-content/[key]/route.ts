import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { SIP_SITE_CONTENT_KEYS, upsertSiteContent, type SipSiteContentSectionKey } from "@/modules/sip/api/siteContent";

const VALID_KEYS = SIP_SITE_CONTENT_KEYS;

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await getSession();
  if (!hasModuleAccess(session, "sip")) {
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

  await upsertSiteContent(key as SipSiteContentSectionKey, content);
  return NextResponse.json({ ok: true });
}
