import { getTanwirViewer } from "@/modules/tanwir/api/access";
import { streamUpload } from "@/modules/tanwir/api/files";
import { authorizeSubmissionFile } from "@/modules/tanwir/api/submissions";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(id)) return new Response(null, { status: 404 });
  const viewer = await getTanwirViewer();
  if (!viewer) return new Response(null, { status: 404 });
  const file = await authorizeSubmissionFile(id, viewer);
  if (!file) return new Response(null, { status: 404 });
  return streamUpload(request, file.filePath, file.mime);
}
