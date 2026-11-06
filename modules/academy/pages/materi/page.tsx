import Link from "next/link";
import { requireAcademyAvailable, getAcademyUser } from "../../api/access";
import { listMaterials } from "../../api/materials";
import { PageHeading, EmptyState, inputClass, linkButton } from "../../components/ui";
import { AcademyIcon } from "../../components/icons";
import { learnerCohorts } from "../../api/learner-cohorts";
export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; cohort?: string }> }) {
  await requireAcademyAvailable(); const query = await searchParams; const search = (query.q ?? "").slice(0, 100);
  const user = await getAcademyUser();
  const cohorts = user?.academyProfile ? (await learnerCohorts()).filter(item => item.joined) : [];
  const cohort = query.cohort ?? cohorts.find(item => item.current)?.id ?? cohorts[0]?.id ?? "";
  const result = await listMaterials(search, Math.max(1, Number.parseInt(query.page ?? "1") || 1), false, "", cohort);
  const href = (page: number) => "/academy/materi?" + new URLSearchParams({ q: search, cohort, page: String(page) });
  return <div className="academy-page"><PageHeading title="Materi">Pilih materi untuk mulai belajar.</PageHeading><Link href="/academy/angkatan" className="mb-5 inline-block text-sm text-green-700">Kelola keikutsertaan angkatan →</Link><form className="mb-6 flex flex-wrap items-end gap-3">{cohorts.length > 0 && <label className="text-sm">Angkatan<select name="cohort" defaultValue={cohort} className={inputClass}>{cohorts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}<label className="flex-1 text-sm">Cari materi<input name="q" maxLength={100} defaultValue={search} className={inputClass} placeholder="Judul materi" /></label><button className={linkButton}>Cari</button></form>
    <div className="space-y-3">{result.items.map((item, index) => <Link href={`/academy/materi/${item.id}`} key={item.id} className="academy-card academy-program-row hover:border-green-200"><span className="academy-icon-tile"><AcademyIcon name="BookOpen" className="h-5 w-5" /></span><div className="flex-1"><h2 className="text-sm font-semibold">{(result.page - 1) * 20 + index + 1}. {item.title}</h2>{item.shortDescription && <p className="academy-muted">{item.shortDescription}</p>}<p className="academy-muted">{item.videoProvider === "AUDIO" ? "Audio" : "Video"} · {item._count.attachments} lampiran</p></div><span className="text-sm text-green-700">Buka →</span></Link>)}</div>
    {!result.items.length && <EmptyState>{search ? "Tidak ada materi yang sesuai pencarian." : "Materi belum tersedia untuk angkatan Anda."}</EmptyState>}<nav aria-label="Halaman materi" className="mt-5 flex gap-4 text-sm"><span>{result.total} materi</span>{result.page > 1 && <Link href={href(result.page - 1)}>Sebelumnya</Link>}{result.page < result.pages && <Link href={href(result.page + 1)}>Berikutnya</Link>}</nav>
  </div>;
}
