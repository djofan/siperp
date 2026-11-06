import "server-only";
import { apiRequest } from "@/lib/api";
import { academyPage } from "./page-data";
import type { GetAdminLessonResult } from "./admin-curriculum";
export type MaterialSummary = { videoUrl?: string | null; attachments?: { id: string; title: string; fileUrl: string; fileType: string | null }[]; id: string; title: string; slug: string; shortDescription: string | null; videoProvider: string; isPublished: boolean; order: number; releaseDay: number; chapterId: string; chapter: { id: string; courseId: string; isPublished: boolean; course: { id: string; slug: string; isPublished: boolean; cohortId: string | null; cohort: { id: string; title: string } | null } }; _count: { attachments: number } };
export type MaterialPage = { items: MaterialSummary[]; total: number; page: number; pages: number; nextOrder?: number };
export type AdminMaterial = NonNullable<GetAdminLessonResult> & { chapter: { id: string; title: string; courseId: string; isPublished: boolean; course: { isPublished: boolean; cohortId: string | null; cohort: { id: string; title: string } | null } } };
export async function listMaterials(search = "", page = 1, admin = false, status = "", cohort = "", all = false) {
  return apiRequest<MaterialPage>(`academy/${admin ? "admin/" : ""}materials?${new URLSearchParams({ search, page: String(page), status, cohort, ...(all ? { all: "1" } : {}) })}`);
}
export async function getAdminMaterial(id: string) { return academyPage<AdminMaterial>(`academy/admin/materials/${encodeURIComponent(id)}`); }
export async function getMaterial(id: string) { return academyPage<MaterialSummary>(`academy/materials/${encodeURIComponent(id)}`); }
