import Link from "next/link";
import { TeacherAudioField } from "../../../components/TeacherAudioField";
import { ChapterSelect } from "../../../components/ChapterSelect";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyTeacherMaterial, AcademyTeacherMaterialList } from "@/contracts/modules/academy";
import { requireAcademyTeacher } from "../../../api/access";
import { saveTeacherMaterial } from "../../../api/teacher-actions";
import { MaterialForm } from "../../../components/MaterialForm";
import { UploadMaterial } from "../../../components/UploadMaterial";
import { PageHeading, inputClass } from "../../../components/ui";

export default async function MaterialsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAcademyTeacher();
  const query = await searchParams;
  const saved = query.saved === "created" ? "Materi berhasil dibuat." : query.saved === "updated" ? "Materi berhasil diperbarui." : null;
  const cohort = typeof query.cohort === "string" ? query.cohort.slice(0, 191) : "";
  const page = Math.max(1, Math.min(100000, Number.parseInt(String(query.page ?? "1"), 10) || 1));
  const data = await academyPage<AcademyTeacherMaterialList>(
    `academy/teacher/materials?${new URLSearchParams({ view: "table", cohort, page: String(page) })}`,
  );
  const selected = data.items.find(item => item.id === query.edit);
  const href = (target: number, edit?: string) => `/academy/pengajar/materi?${new URLSearchParams({
    ...(cohort ? { cohort } : {}), page: String(target), ...(edit ? { edit } : {}),
  })}`;
  const fields = (lesson?: AcademyTeacherMaterial) => <>
    <label className="block text-sm">Judul materi<input name="title" required maxLength={191} defaultValue={lesson?.title} className={inputClass}/></label>
    <label className="block text-sm">Teks materi<textarea name="contentSummary" maxLength={30000} rows={8} defaultValue={lesson?.contentSummary ?? ""} className={inputClass} placeholder="Tulis materi yang dapat dibaca peserta..."/></label>
    <TeacherAudioField existingUrl={lesson?.videoUrl ?? ""}/>

  </>;

  return <div className="mx-auto max-w-7xl p-4 md:p-6">
    <PageHeading title="Materi teks & audio">Kelola materi harian seluruh angkatan. Materi baru otomatis disusun sesuai urutan penambahan.</PageHeading>
    {saved && <p role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">{saved} {query.visibility === "published" ? "Status: Terpublikasi. Peserta angkatan tujuan dapat membukanya setelah pembelajaran dimulai." : query.visibility === "draft" ? "Status: Draft. Materi belum terlihat peserta." : ""}</p>}
    {!data.chapters.length && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm">Belum ada bab. Minta admin menyiapkan 12 bab melalui panel Angkatan.</p>}
    <details id="tambah-materi" open={query.tambah === "1"} className="mb-6 rounded-2xl border border-gray-100 bg-white p-5">
      <summary className="cursor-pointer font-semibold text-green-700">Tambah materi</summary>
      <MaterialForm action={saveTeacherMaterial.bind(null, null)}>
        <ChapterSelect chapters={data.chapters}/>{fields()}
      </MaterialForm>
    </details>

    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white" aria-label="Daftar materi">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 p-5">
        <div><h2 className="font-semibold">Daftar materi</h2><p className="mt-1 text-sm text-gray-500">{data.total} materi ditemukan</p></div>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Filter angkatan
            <select name="cohort" defaultValue={cohort} className={inputClass}>
              <option value="">Semua angkatan</option>
              {data.cohorts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <button className="rounded-xl bg-green-700 px-4 py-3 text-sm font-medium text-white">Terapkan</button>
          {cohort && <Link href="/academy/pengajar/materi" className="px-2 py-3 text-sm text-gray-600 underline">Reset</Link>}
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr>
            {["No.", "Materi", "Angkatan", "Bab", "Status", "Audio", "Aksi"].map(label => <th scope="col" key={label} className="px-5 py-3 font-medium">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data.items.map((lesson, index) => <tr key={lesson.id} className={selected?.id === lesson.id ? "bg-green-50" : "hover:bg-gray-50"}>
              <td className="px-5 py-4 text-gray-500">{(data.page - 1) * data.perPage + index + 1}</td>
              <td className="max-w-xs px-5 py-4"><p className="break-words font-medium">{lesson.title}</p>{lesson.contentSummary && <p className="mt-1 line-clamp-2 break-words text-xs text-gray-500">{lesson.contentSummary}</p>}</td>
              <td className="px-5 py-4">{lesson.cohortTitle}</td>
              <td className="px-5 py-4">{lesson.chapterTitle}</td>
              <td className="px-5 py-4"><span className={`inline-block rounded-full px-2.5 py-1 text-xs ${lesson.isPublished ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{lesson.isPublished ? "Terpublikasi" : "Draft"}</span></td>
              <td className="px-5 py-4">{lesson.videoUrl ? "Tersedia" : "Tanpa audio"}</td>
              <td className="px-5 py-4"><Link href={href(data.page, lesson.id) + "#edit-materi"} className="font-medium text-green-700 underline" aria-label={`Edit materi ${lesson.title}`}>Edit</Link></td>
            </tr>)}
            {!data.items.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500">Belum ada materi{cohort ? " pada angkatan ini" : ""}. <Link href="?tambah=1#tambah-materi" className="text-green-700 underline">Tambah materi pertama</Link>, pilih angkatan dan bab, lalu simpan draft atau publikasikan.</td></tr>}
          </tbody>
        </table>
      </div>
      <nav aria-label="Halaman daftar materi" className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-5 text-sm">
        <p className="text-gray-500">{data.total ? `Menampilkan ${(data.page - 1) * data.perPage + 1}–${Math.min(data.page * data.perPage, data.total)} dari ${data.total} materi` : "0 materi"} · Halaman {data.page} dari {data.lastPage}</p>
        <div className="flex gap-2">
          {data.page > 1 ? <Link href={href(data.page - 1)} className="rounded-lg border px-3 py-2">Sebelumnya</Link> : <span aria-disabled="true" className="rounded-lg border px-3 py-2 text-gray-400">Sebelumnya</span>}
          {data.page < data.lastPage ? <Link href={href(data.page + 1)} className="rounded-lg border px-3 py-2">Berikutnya</Link> : <span aria-disabled="true" className="rounded-lg border px-3 py-2 text-gray-400">Berikutnya</span>}
        </div>
      </nav>
    </section>

    {selected && <section id="edit-materi" key={selected.id} className="mt-6 scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-semibold">Edit materi: {selected.title}</h2><p className="mt-1 text-sm text-gray-500">{selected.cohortTitle} · {selected.chapterTitle}</p></div><Link href={href(data.page)} className="text-sm text-gray-600 underline">Tutup</Link></div>
      <MaterialForm action={saveTeacherMaterial.bind(null, selected.id)} initialPublished={selected.isPublished}>
        <input type="hidden" name="chapterId" value={selected.chapterId}/>{fields(selected)}
      </MaterialForm>
      <UploadMaterial lessonId={selected.id}/>
    </section>}
  </div>;
}
