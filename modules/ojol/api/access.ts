import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiRequest, ApiError } from "@/lib/api";
import { requireModuleAdmin, requireModulePublic } from "@/modules/core/module-access";
import { OjolError } from "./errors";

export { OjolError, errorMessage } from "./errors";

export type OjolMemberRole = "guru" | "peserta";

/** Pengguna yang sedang login, dilihat dari sisi modul Ojol (cache per request). */
export const getOjolViewer = cache(async () => {
  if (!await getSession()) return null;
  try { return await apiRequest<{ userId: string; name: string; isSuperadmin: boolean; isAdmin: boolean; member: { id: string; code: string; role: "guru" | "peserta"; groupId: string | null; photo: string | null } | null }>("ojol/viewer"); }
  catch (error) { if (error instanceof ApiError && [401, 403].includes(error.status)) return null; throw error; }
});

export type OjolViewer = NonNullable<Awaited<ReturnType<typeof getOjolViewer>>>;

export function homePathFor(viewer: OjolViewer | null): string {
  if (viewer?.member?.role === "guru") return "/ojol/guru";
  if (viewer?.member?.role === "peserta") return "/ojol/peserta";
  if (viewer?.isAdmin) return "/admin/ojol";
  return "/ojol/masuk";
}

/** Guard app guru/peserta. Modul nonaktif → 404 (kecuali superadmin), belum login → halaman masuk. */
export async function requireOjolMember(role: OjolMemberRole) {
  await requireModulePublic("ojol");
  const viewer = await getOjolViewer();
  if (!viewer) redirect("/ojol/masuk");
  const member = viewer.member;
  if (!member || member.role !== role) redirect(homePathFor(viewer));
  return { ...viewer, member };
}

/** Guard admin Ojol di /admin/ojol — memastikan peran admin, bukan sekadar punya akses modul. */
export async function requireOjolAdmin() {
  const { session } = await requireModuleAdmin("ojol");
  const viewer = await getOjolViewer();
  if (!viewer) redirect(`/admin/login?from=${encodeURIComponent("/admin/ojol")}`);
  if (!viewer.isAdmin) redirect("/admin?error=forbidden");
  return { ...viewer, sessionName: session.name };
}

/** Versi tanpa redirect untuk route handler / server action. */
export async function assertOjolAdmin() {
  const viewer = await getOjolViewer();
  if (!viewer?.isAdmin) throw new OjolError("Tidak diizinkan.");
  return viewer;
}

export async function assertOjolMember(role: OjolMemberRole) {
  const viewer = await getOjolViewer();
  if (!viewer?.member || viewer.member.role !== role) throw new OjolError("Tidak diizinkan.");
  return { ...viewer, member: viewer.member };
}

