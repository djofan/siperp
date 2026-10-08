import { prisma } from "@/lib/prisma";
import { getOjolViewer } from "@/modules/ojol/api/access";
import { streamUpload } from "@/modules/ojol/api/files";

export const runtime = "nodejs";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Foto profil hanya untuk pengguna Ojol yang sedang login (bukan publik).
export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(memberId)) return new Response(null, { status: 404 });
  const viewer = await getOjolViewer();
  if (!viewer?.member && !viewer?.isAdmin) return new Response(null, { status: 404 });
  const member = await prisma.ojolMember.findUnique({ where: { id: memberId }, select: { photo: true } });
  const ext = member?.photo?.split(".").pop() ?? "";
  if (!member?.photo || !MIME[ext]) return new Response(null, { status: 404 });
  return streamUpload(request, member.photo, MIME[ext]);
}
