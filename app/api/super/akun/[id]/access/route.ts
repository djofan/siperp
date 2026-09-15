import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setUserModuleAccess } from "@/modules/core/users";

const VALID_ROLES = new Set(["admin", "editor"]);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.isSuperadmin) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const rawEntries = Array.isArray(body?.entries) ? body.entries : [];

  const entries = rawEntries
    .filter(
      (entry: unknown): entry is { moduleId: string; role: string } =>
        typeof (entry as { moduleId?: unknown })?.moduleId === "string" &&
        typeof (entry as { role?: unknown })?.role === "string"
    )
    .map((entry: { moduleId: string; role: string }) => ({
      moduleId: entry.moduleId,
      role: VALID_ROLES.has(entry.role) ? entry.role : "admin",
    }));

  await setUserModuleAccess(id, entries);

  return NextResponse.json({ ok: true });
}
