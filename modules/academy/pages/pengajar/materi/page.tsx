import { prisma } from "@/lib/prisma";
import { requireAcademyTeacher } from "../../../api/access";
import { saveTeacherMaterial } from "../../../api/teacher-actions";
import { ActionForm } from "../../../components/ActionForm";
import { UploadMaterial } from "../../../components/UploadMaterial";
import { PageHeading, inputClass } from "../../../components/ui";
export default async function MaterialsPage() {
  await requireAcademyTeacher();
  const chapters = await prisma.zakatAcademyChapter.findMany({ orderBy: [{ course: { order: "asc" } }, { order: "asc" }], select: { id: true, title: true, course: { select: { title: true } }, lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, contentSummary: true, videoUrl: true, order: true, releaseDay: true, isPublished: true } } } });
  const fields = (lesson?: typeof chapters[number]["lessons"][number]) => <>
    <label className="block text-sm">Judul materi<input name="title" required maxLength={191} defaultValue={lesson?.title} className={inputClass} /></label>
    <label className="block text-sm">Teks materi<textarea name="contentSummary" maxLength={30000} rows={8} defaultValue={lesson?.contentSummary ?? ""} className={inputClass} placeholder="Tulis materi yang dapat dibaca peserta…" /></label>
    <label className="block text-sm">URL audio (opsional)<input name="videoUrl" maxLength={2048} defaultValue={lesson?.videoUrl} className={inputClass} placeholder="https://…/materi.mp3" /></label>
    <div className="grid grid-cols-2 gap-4"><label className="text-sm">Hari rilis<input name="releaseDay" type="number" min={1} max={30} required defaultValue={lesson?.releaseDay ?? 1} className={inputClass} /></label><label className="text-sm">Urutan<input name="order" type="number" min={0} required defaultValue={lesson?.order ?? 0} className={inputClass} /></label></div>
    <label className="flex gap-2 text-sm"><input name="isPublished" type="checkbox" defaultChecked={lesson?.isPublished} />Publikasikan materi</label>
  </>;
  return <div className="mx-auto max-w-5xl p-4 md:p-6"><PageHeading title="Materi teks & audio">Isi teks, audio, atau keduanya. Materi terpublikasi dibuka sesuai hari rilis program.</PageHeading>
    <details className="mb-6 rounded-2xl border border-gray-100 bg-white p-5"><summary className="cursor-pointer font-semibold text-green-700">Tambah materi</summary><ActionForm className="mt-4" action={saveTeacherMaterial.bind(null, null)} label="Simpan materi"><label className="block text-sm">Bab<select name="chapterId" required className={inputClass}>{chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.course.title} · {chapter.title}</option>)}</select></label>{fields()}</ActionForm></details>
    {chapters.map(chapter => <section key={chapter.id} className="mb-6"><h2 className="mb-3 font-semibold">{chapter.course.title} · {chapter.title}</h2><div className="space-y-3">{chapter.lessons.map(lesson => <details key={lesson.id} className="rounded-2xl border border-gray-100 bg-white p-5"><summary className="cursor-pointer font-medium">{lesson.title}<span className="ml-3 text-xs text-gray-500">{lesson.isPublished ? "Terpublikasi" : "Draft"} · Hari {lesson.releaseDay}</span></summary><ActionForm className="mt-5" action={saveTeacherMaterial.bind(null, lesson.id)} label="Simpan perubahan"><input type="hidden" name="chapterId" value={chapter.id} />{fields(lesson)}</ActionForm><UploadMaterial lessonId={lesson.id} /></details>)}</div></section>)}
  </div>;
}
