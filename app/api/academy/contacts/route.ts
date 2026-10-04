import { prisma } from "@/lib/prisma";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { contactVcard } from "@/modules/academy/api/intake-policy";
export async function GET(request: Request) {
  await requireAcademyAdmin();
  const courseId = new URL(request.url).searchParams.get("courseId");
  if (!courseId) return new Response("Program wajib dipilih", { status: 400 });
  const rows = await prisma.zakatAcademyEnrollment.findMany({ where: { courseId }, take: 200, select: { profile: { select: { phone: true, user: { select: { name: true, email: true } } } } } });
  const body = rows.filter(row => row.profile.phone).map(row => contactVcard(row.profile.user.name, row.profile.phone!, row.profile.user.email)).join("");
  return new Response(body, { headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": 'attachment; filename="insan-academy-contacts.vcf"', "Cache-Control": "private, no-store" } });
}
