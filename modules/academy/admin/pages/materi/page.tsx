import Link from "next/link";
import { safeResourceUrl } from "../../../api/policy";
import { requireAcademyAdmin } from "../../../api/admin-access";
import { listMaterials, type MaterialSummary } from "../../../api/materials";
import { AdminHeading, AddLink, AdminEmpty, PublishBadge, SavedNotice } from "../../../components/admin/AdminUi";
import { academyPage } from "../../../api/page-data";
import type { AcademyCohort } from "../../../api/page-contracts";
export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ tersimpan?: string }> }) {
  await requireAcademyAdmin(); const query = await searchParams;
  const [cohorts, result] = await Promise.all([academyPage<AcademyCohort[]>("academy/admin/cohorts"), listMaterials("", 1, true, "", "", true)]);
  const groups = cohorts.map(cohort => ({ id: cohort.id, title: cohort.title, items: result.items.filter(item => item.chapter.course.cohortId === cohort.id) }));
  const archive = result.items.filter(item => !item.chapter.course.cohortId);
  if (archive.length) groups.push({ id: "unassigned", title: "Arsip belum memiliki angkatan", items: archive });
  return <><AdminHeading title="Materi" description="Seluruh materi audio dan PDF ditampilkan per angkatan, dari urutan terkecil hingga terakhir." action={<AddLink href="/admin/academy/materi/baru">Tambah materi</AddLink>} /><SavedNotice saved={query.tersimpan === "1"} />
    <div className="space-y-6">{groups.map(group => <section key={group.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5"><div><h2 className="font-semibold">{group.title}</h2><p className="mt-1 text-xs text-gray-500">{group.items.length} materi</p></div>{group.id !== "unassigned" && <Link href={`/admin/academy/materi/baru?cohort=${encodeURIComponent(group.id)}`} className="text-sm font-medium text-green-700">Tambah materi →</Link>}</div>
      {group.items.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Urutan", "Materi", "Jenis", "File", "Status", "Aksi"].map(label => <th key={label} className="p-4 text-gray-500">{label}</th>)}</tr></thead><tbody>{group.items.map(item => <tr key={item.id} className="border-t border-gray-100"><td className="p-4 font-semibold tabular-nums">{item.order}</td><td className="p-4 font-semibold">{item.title}<p className="mt-1 max-w-sm text-xs font-normal text-gray-500">{item.shortDescription}</p></td><td className="p-4">{item.videoProvider !== "AUDIO" ? "Video" : item.attachments?.some(file => file.fileType === "application/pdf") ? (item.videoUrl ? "Audio + PDF" : "PDF") : "Audio"}</td><td className="p-4"><MaterialAudioFile material={item} /></td><td className="p-4"><PublishBadge published={item.isPublished} /></td><td className="p-4"><Link href={`/admin/academy/materi/${item.id}`} className="text-green-700 hover:underline">Edit materi</Link></td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-gray-500">Belum ada materi pada angkatan ini.</p>}
    </section>)}</div>{!groups.length && <AdminEmpty>Belum ada angkatan atau materi. Buat angkatan untuk mulai menambahkan materi.</AdminEmpty>}
    <p className="mt-5 text-sm text-gray-500">{result.total} materi ditampilkan seluruhnya.</p>
  </>;
}

function MaterialAudioFile({ material }: { material: MaterialSummary }) {
  const files = material.attachments?.filter(file => file.fileUrl === material.videoUrl || file.fileType === "application/pdf") ?? [];
  if (!files.length) return <span className="text-gray-400">Belum ada file</span>;
  return <div className="min-w-56 max-w-xs space-y-2">{files.map(file => {
    const url = safeResourceUrl(file.fileUrl);
    return url ? <a key={file.id} href={url} target="_blank" rel="noopener noreferrer" className="block break-words text-green-700 hover:underline">{file.fileType === "application/pdf" ? "PDF: " : "Audio: "}{file.title}</a> : null;
  })}</div>;
}
