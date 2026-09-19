import Link from "next/link";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { listAdminCourses } from "@/modules/academy/api/admin-curriculum";
import { AdminHeading, AddLink, AdminEmpty, PublishBadge } from "@/modules/academy/components/admin/AdminUi";
import { Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyAdmin();
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const status = typeof query.status === "string" ? query.status : "";
  const requested = Number(query.page);
  const result = await listAdminCourses(search, status, Number.isSafeInteger(requested) && requested > 0 ? requested : 1);
  const pageHref = (page: number) => "/admin/academy/program?" + new URLSearchParams({ q: search, status, page: String(page) });
  return <><AdminHeading title="Program belajar" description="Susun kurikulum dan atur publikasi program." action={<AddLink href="/admin/academy/program/baru">Tambah program</AddLink>} />
    <form action="/admin/academy/program" className="mb-6 flex flex-wrap gap-3">
      <Input name="q" aria-label="Cari judul program" placeholder="Cari judul program…" defaultValue={search} maxLength={100} className="max-w-sm" />
      <Select name="status" aria-label="Status publikasi" defaultValue={status} className="max-w-48"><option value="">Semua status</option><option value="published">Terpublikasi</option><option value="draft">Draft</option></Select>
      <Button type="submit">Cari</Button>
    </form>
    {result.items.length ? <div className="overflow-x-auto rounded-2xl bg-surface p-4"><table className="w-full text-left text-sm">
      <thead><tr>{["Program", "Status", "Bab", "Peserta", "Urutan", "Aksi"].map(label => <th key={label} className="p-3 text-foreground/60">{label}</th>)}</tr></thead>
      <tbody>{result.items.map(item => <tr key={item.id} className="border-t border-border text-foreground"><td className="p-3 font-semibold">{item.title}</td><td className="p-3"><PublishBadge published={item.isPublished} /></td><td className="p-3">{item._count.chapters}</td><td className="p-3">{item._count.enrollments}</td><td className="p-3">{item.order}</td><td className="p-3"><Link className="text-accent hover:underline" href={`/admin/academy/program/${item.id}`}>Kelola<span className="sr-only"> {item.title}</span></Link></td></tr>)}</tbody>
    </table></div> : <AdminEmpty>Belum ada program yang cocok.</AdminEmpty>}
    <nav aria-label="Halaman program" className="mt-5 flex flex-wrap items-center gap-4 text-sm text-foreground">
      <span>{result.total} program · Halaman {result.page} dari {result.pages}</span>
      {result.page > 1 && <Link href={pageHref(result.page - 1)} className="text-accent">Sebelumnya</Link>}
      {result.page < result.pages && <Link href={pageHref(result.page + 1)} className="text-accent">Berikutnya</Link>}
    </nav>
  </>;
}

