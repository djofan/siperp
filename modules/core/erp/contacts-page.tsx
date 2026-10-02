import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSuperadmin } from "./access";
import { ActionForm } from "./ActionForm";
import { saveContact, syncContacts, mergeContacts } from "./contact-actions";
const input = "w-full rounded-lg border border-border bg-surface p-2 text-sm";
export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; id?: string }> }) {
  await requireSuperadmin();
  const { q = "", page = "1", id } = await searchParams;
  const current = Math.max(1, Number.parseInt(page) || 1);
  const where = q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] } : {};
  const [contacts, count, selected] = await Promise.all([
    prisma.coreContact.findMany({ where, include: { sources: true }, orderBy: { name: "asc" }, take: 30, skip: (current-1)*30 }),
    prisma.coreContact.count({ where }), id ? prisma.coreContact.findUnique({ where: { id }, include: { sources: true } }) : null,
  ]);
  return <div className="space-y-6"><PageHeader title="Kontak Terpadu" description="Gabungkan peran lintas modul sambil mempertahankan sumber data asli. Sinkronkan setelah data modul berubah." />
    <ActionForm action={syncContacts} button="Sinkronkan dari semua modul" />
    <form className="flex gap-2"><input aria-label="Cari kontak" name="q" defaultValue={q} placeholder="Nama, email, nomor telepon" className={input} /><button className="rounded-lg border px-4">Cari</button></form>
    <p className="text-sm">{count} kontak · halaman {current}</p>
    <div className="overflow-x-auto rounded-xl border border-border bg-surface"><table className="w-full text-left text-sm"><thead><tr>{["Nama", "Telepon / email", "Peran dan sumber", ""].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{contacts.map(c => <tr key={c.id} className="border-t border-border"><td className="p-3">{c.name}</td><td className="p-3">{c.phone ?? "—"}<br />{c.email}</td><td className="p-3">{c.sources.map(s => <div key={s.id}>{s.role} · {s.source}</div>)}</td><td className="p-3"><Link href={`?q=${encodeURIComponent(q)}&page=${current}&id=${c.id}`} className="underline">Detail / edit</Link></td></tr>)}</tbody></table>{!contacts.length && <p className="p-6">Belum ada kontak. Jalankan sinkronisasi atau buat kontak.</p>}</div>
    <div className="flex gap-4">{current > 1 && <Link href={`?q=${encodeURIComponent(q)}&page=${current-1}`}>Sebelumnya</Link>}{current*30 < count && <Link href={`?q=${encodeURIComponent(q)}&page=${current+1}`}>Berikutnya</Link>}</div>
    <section className="rounded-xl border border-border bg-surface p-5"><h2 className="mb-3 font-semibold">{selected ? `Edit ${selected.name}` : "Tambah kontak"}</h2><ActionForm key={selected?.id ?? "new"} action={saveContact} button="Simpan kontak"><input type="hidden" name="id" value={selected?.id ?? ""} /><label className="block">Nama<input required name="name" defaultValue={selected?.name} className={input} /></label><label className="block">Telepon<input name="phone" defaultValue={selected?.phone ?? ""} className={input} /></label><label className="block">Email<input type="email" name="email" defaultValue={selected?.email ?? ""} className={input} /></label><label className="block">Catatan<textarea name="notes" defaultValue={selected?.notes ?? ""} className={input} /></label></ActionForm>
      {selected?.sources.map(s => <p key={s.id} className="mt-3 text-sm">{s.source} / {s.sourceId}: {s.name}, {s.phone}, {s.email} · sinkronisasi {s.syncedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</p>)}
    </section>
    {contacts.length > 1 && <details className="rounded-xl border border-border bg-surface p-5"><summary className="cursor-pointer font-semibold">Gabungkan kontak duplikat</summary><p className="my-3 text-sm">Kontak di halaman ini dapat digabung setelah Anda memastikan identitasnya. Nama dan catatan kontak tujuan dipertahankan; data asli modul tidak diubah.</p><ActionForm action={mergeContacts} button="Gabungkan kontak"><label className="block">Kontak tujuan<select name="target" className={input}>{contacts.map(c => <option key={c.id} value={c.id}>{c.name} · {c.email ?? c.phone ?? c.id}</option>)}</select></label><label className="block">Kontak duplikat<select name="source" className={input}>{contacts.map(c => <option key={c.id} value={c.id}>{c.name} · {c.email ?? c.phone ?? c.id}</option>)}</select></label><label className="block"><input required type="checkbox" name="confirm" value="yes" /> Saya memastikan kedua kontak adalah orang yang sama.</label></ActionForm></details>}
  </div>;
}
