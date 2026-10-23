import { requireAcademyAdmin } from "../../api/admin-access";
import { listMaterials } from "../../api/materials";
import { AdminHeading, AddLink } from "../../components/admin/AdminUi";
export default async function Page() {
  await requireAcademyAdmin();
  const [all, published, draft] = await Promise.all([listMaterials("", 1, true), listMaterials("", 1, true, "published"), listMaterials("", 1, true, "draft")]);
  return <><AdminHeading title="Academy" description="Kelola daftar materi teks, audio, lampiran, dan ujian belajar." action={<AddLink href="/admin/academy/materi">Kelola materi</AddLink>} /><div className="grid gap-4 sm:grid-cols-3">{[["Total materi", all.total], ["Terpublikasi", published.total], ["Draft", draft.total]].map(([label, value]) => <div key={label} className="academy-card p-6"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div></>;
}
