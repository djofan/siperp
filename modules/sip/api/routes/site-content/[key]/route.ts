import { NextResponse } from "next/server";
import { getSession, hasModuleAccess } from "@/lib/auth";
import { upsertSiteContent, type SipSiteContentSectionKey } from "@/modules/sip/api/siteContent";

const VALID_KEYS: SipSiteContentSectionKey[] = ["hero", "tentang", "jangkauanBantuan", "kontak"];

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

  await upsertSiteContent(key as SipSiteContentSectionKey, body.content);
  return NextResponse.json({ ok: true });
}
