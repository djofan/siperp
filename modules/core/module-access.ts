import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiRequest, ApiError } from "@/lib/api";
import type { CoreModule } from "./modules";

async function findModule(slug: string) {
  try { return await apiRequest<CoreModule>(`core/modules/${encodeURIComponent(slug)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}

// Guard admin modul. Modul NONAKTIF tetap bisa dibuka superadmin (buat ngetes modul yang
// masih dikembangkan), tapi admin biasa baru bisa masuk kalau modul aktif DAN punya akses.
export async function requireModuleAdmin(slug: string) {
  const session = await getSession();
  if (!session) redirect(`/admin/login?from=${encodeURIComponent(`/admin/${slug}`)}`);

  const registered = await findModule(slug);
  if (!registered) notFound();
  if (!session.isSuperadmin && (!registered.isActive || !session.moduleSlugs.includes(slug))) {
    redirect("/admin?error=forbidden");
  }
  return { session, module: registered };
}

// Guard halaman publik modul. Modul nonaktif = 404 untuk pengunjung, kecuali superadmin
// yang sedang login (supaya halaman publiknya tetap bisa dites sebelum dirilis).
export async function requireModulePublic(slug: string) {
  const registered = await findModule(slug);
  if (registered?.isActive) return registered;

  const session = await getSession();
  if (registered && session?.isSuperadmin) return registered;
  notFound();
}
