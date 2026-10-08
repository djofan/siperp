import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireModuleAdmin, requireModulePublic } from "@/modules/core/module-access";
import { TanwirError } from "./errors";

export { TanwirError, errorMessage } from "./errors";

export type TanwirMemberRole = "guru" | "peserta";

/** Pengguna yang sedang login, dilihat dari sisi modul Tanwir (cache per request). */
export const getTanwirViewer = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findFirst({
    where: { id: session.userId, isActive: true },
    select: {
      id: true,
      name: true,
      isSuperadmin: true,
      moduleAccess: { where: { module: { slug: "tanwir" } }, select: { role: true } },
      tanwirMember: { select: { id: true, code: true, role: true, groupId: true, photo: true } },
    },
  });
  if (!user) return null;
  return {
    userId: user.id,
    name: user.name,
    isSuperadmin: user.isSuperadmin,
    // Admin Tanwir = superadmin atau akun Core dengan akses modul tanwir berperan admin.
    isAdmin: user.isSuperadmin || user.moduleAccess.some((access) => access.role === "admin"),
    member: user.tanwirMember,
  };
});

export type TanwirViewer = NonNullable<Awaited<ReturnType<typeof getTanwirViewer>>>;

export function homePathFor(viewer: TanwirViewer | null): string {
  if (viewer?.member?.role === "guru") return "/tanwir/guru";
  if (viewer?.member?.role === "peserta") return "/tanwir/peserta";
  if (viewer?.isAdmin) return "/admin/tanwir";
  return "/tanwir/masuk";
}

/** Guard app guru/peserta. Modul nonaktif → 404 (kecuali superadmin), belum login → halaman masuk. */
export async function requireTanwirMember(role: TanwirMemberRole) {
  await requireModulePublic("tanwir");
  const viewer = await getTanwirViewer();
  if (!viewer) redirect("/tanwir/masuk");
  const member = viewer.member;
  if (!member || member.role !== role) redirect(homePathFor(viewer));
  return { ...viewer, member };
}

/** Guard admin Tanwir di /admin/tanwir — memastikan peran admin, bukan sekadar punya akses modul. */
export async function requireTanwirAdmin() {
  const { session } = await requireModuleAdmin("tanwir");
  const viewer = await getTanwirViewer();
  if (!viewer) redirect(`/admin/login?from=${encodeURIComponent("/admin/tanwir")}`);
  if (!viewer.isAdmin) redirect("/admin?error=forbidden");
  return { ...viewer, sessionName: session.name };
}

/** Versi tanpa redirect untuk route handler / server action. */
export async function assertTanwirAdmin() {
  const viewer = await getTanwirViewer();
  if (!viewer?.isAdmin) throw new TanwirError("Tidak diizinkan.");
  return viewer;
}

export async function assertTanwirMember(role: TanwirMemberRole) {
  const viewer = await getTanwirViewer();
  if (!viewer?.member || viewer.member.role !== role) throw new TanwirError("Tidak diizinkan.");
  return { ...viewer, member: viewer.member };
}

