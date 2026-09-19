import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { curriculumStats } from "@/modules/academy/api/admin-curriculum";
import { AdminHeading, AddLink } from "@/modules/academy/components/admin/AdminUi";
export default async function Page() {
  await requireAcademyAdmin();
  const stats = await curriculumStats();
  return <><AdminHeading title="Academy" description="Kelola program, susunan bab, video, dan lampiran belajar." action={<AddLink href="/admin/academy/program">Kelola program</AddLink>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Program", stats.courses], ["Program terpublikasi", stats.published], ["Bab", stats.chapters], ["Materi", stats.lessons],
    ].map(([label, value]) => <div key={label} className="rounded-2xl bg-surface p-6 shadow-sm"><p className="text-sm text-foreground/60">{label}</p><p className="mt-2 text-3xl font-bold text-foreground">{value}</p></div>)}</div>
  </>;
}

