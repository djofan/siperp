import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { AdminHeading, SavedNotice } from "@/modules/academy/components/admin/AdminUi";
import { ContentForm } from "@/modules/academy/components/admin/ContentForm";
import { DeleteForm } from "@/modules/academy/components/admin/ContentControls";
import { getAdminMaterial } from "@/modules/academy/api/materials";
import { saveMaterial, deleteMaterial, duplicateMaterial } from "@/modules/academy/api/material-actions";
import { ActionForm } from "@/modules/academy/components/ActionForm";
import { safeResourceUrl } from "@/modules/academy/api/policy";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyCohort } from "@/modules/academy/api/page-contracts";
import { CohortField } from "@/modules/academy/components/admin/CohortField";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tersimpan?: string }> }) {
  await requireAcademyAdmin(); const { id } = await params; const lesson = await getAdminMaterial(id);
  const cohorts = await academyPage<AcademyCohort[]>("academy/admin/cohorts");
  const cohort = lesson.chapter.course.cohort;
  const audioUrl = lesson.videoProvider === "AUDIO" ? safeResourceUrl(lesson.videoUrl) : null;
  const file = lesson.attachments.find(item => item.fileUrl === lesson.videoUrl);
  return <><AdminHeading title={lesson.title} description={cohort ? "Angkatan: " + cohort.title : "Arsip belum memiliki angkatan. Duplikat ke angkatan tujuan untuk menjaga riwayat."} backHref={"/admin/academy/materi?cohort=" + encodeURIComponent(cohort?.id ?? "unassigned")} /><SavedNotice saved={(await searchParams).tersimpan === "1"} />
    <ContentForm key={lesson.updatedAt.toString()} kind="lesson" flat existingAudio={{ url: audioUrl, title: file?.title }} contextField={!cohort ? <CohortField cohorts={cohorts} /> : undefined} action={saveMaterial.bind(null, id)} initial={{ title: lesson.title, isPublished: lesson.isPublished, order: lesson.order, shortDescription: lesson.shortDescription, releaseDay: lesson.releaseDay }} />
    <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5"><h2 className="mb-3 font-semibold">Duplikat ke angkatan lain</h2><p className="mb-4 text-sm text-gray-500">Judul, urutan, deskripsi, dan audio disalin sebagai draft. Progres dan nilai peserta tidak disalin.</p><ActionForm action={duplicateMaterial.bind(null, id)} label="Duplikat materi"><CohortField cohorts={cohorts} exclude={cohort?.id} id="duplicate-cohort" /></ActionForm></section>
    <DeleteForm title={lesson.title} action={deleteMaterial.bind(null, id)} />
  </>;
}
