import path from "node:path";
import { Readable } from "node:stream";
import { getSuperadmin } from "../access";
import { backupRoot, validBackupId } from "../backup";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSuperadmin()) return new Response(null, { status: 403 });
  const { id } = await params;
  if (!validBackupId(id)) return new Response(null, { status: 404 });
  const { stat } = await import(/* turbopackIgnore: true */ "node:fs/promises");
  const { createReadStream } = await import(/* turbopackIgnore: true */ "node:fs");
  const file = path.join(/* turbopackIgnore: true */ backupRoot, id);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return new Response(null, { status: 404 });
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${id}"`, "Content-Length": String(info.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
