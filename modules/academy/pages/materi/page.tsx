import Link from "next/link";
import { requireAcademyAvailable, getAcademyUser } from "../../api/access";
import { listMaterials } from "../../api/materials";
import { PageHeading, EmptyState, inputClass, linkButton } from "../../components/ui";
import { AcademyIcon } from "../../components/icons";
import { learnerCohorts } from "../../api/learner-cohorts";
export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; cohort?: string; status?: string }> }) {
  await requireAcademyAvailable(); const query = await searchParams; const search = (query.q ?? "").slice(0, 100);
  const user = await getAcademyUser();
  const cohorts = user?.academyProfile ? (await learnerCohorts()).filter(item => item.joined) : [];
  const cohort = query.cohort ?? cohorts.find(item => item.current)?.id ?? cohorts[0]?.id ?? "";
  const result = await listMaterials(search, Math.max(1, Number.parseInt(query.page ?? "1") || 1), false, query.status ?? "", cohort);
  const href = (page: number) => "/academy/materi?" + new URLSearchParams({ q: search, cohort, status: query.status ?? "", page: String(page) });
  return <div className="academy-page"><PageHeading title="Materi Belajar">Pilih materi untuk mulai belajar.</PageHeading><form className="mb-6 flex flex-wrap items-end gap-3"><input type="hidden" name="cohort" value={cohort} /><label className="min-w-0 basis-full text-sm sm:flex-1 sm:basis-auto">Cari materi<input name="q" maxLength={100} defaultValue={search} className={inputClass} placeholder="Judul materi" /></label><label className="text-sm">Status<select name="status" defaultValue={query.status ?? ""} className={inputClass}><option value="">Semua materi</option><option value="unread">Belum selesai</option><option value="completed">Selesai</option></select></label><button className={linkButton}>Terapkan</button></form>
    {result.resume && <Link href={`/academy/materi/${result.resume.id}`} className="mb-5 block rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-green-800">Lanjutkan belajar: {result.resume.title} →</Link>}<div className="space-y-3">{result.items.map((item, index) => <Link href={`/academy/materi/${item.id}?back=${encodeURIComponent(href(result.page))}`} key={item.id} className="academy-card academy-program-row hover:border-green-200"><span className="academy-icon-tile"><AcademyIcon name="BookOpen" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{(result.page - 1) * 20 + index + 1}. {item.title}</h2>{item.shortDescription && <p className="academy-muted">{item.shortDescription}</p>}<p className="academy-muted">{item.videoProvider !== "AUDIO" ? "Video" : item._count.pdfs ? (item._count.pdfs === item._count.attachments ? "PDF" : "Audio + PDF") : "Audio"} · {item._count.attachments} lampiran</p></div><span className="w-full pl-14 text-xs text-green-700 sm:w-auto sm:pl-0">{item.completed ? "✓ Selesai" : "Belum selesai"} · Buka →</span></Link>)}</div>
    {!result.items.length && <EmptyState>{search ? "Tidak ada materi yang sesuai pencarian." : "Materi belum tersedia."}</EmptyState>}<nav aria-label="Halaman materi" className="mt-5 flex gap-4 text-sm"><span>{result.total} materi</span>{result.page > 1 && <Link href={href(result.page - 1)}>Sebelumnya</Link>}{result.page < result.pages && <Link href={href(result.page + 1)}>Berikutnya</Link>}</nav>
  </div>;
}
