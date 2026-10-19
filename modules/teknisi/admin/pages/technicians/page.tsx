import Link from "next/link";
import { apiRequest } from "@/lib/api";
import type { Response5 } from "@/modules/teknisi/api/contracts";
import { Card, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/FormField";
import { buttonVariants } from "@/components/ui/Button";
import { requireTechnicianUser } from "../../../api/access";
import { registerTeknisiParticipant, deleteTeknisiAccount } from "../../../api/participant-actions";
import { ActionForm } from "../../../components/ActionForm";
import { Choice, Field } from "../../../components/Fields";
import { ParticipantRegistrationFields } from "@/components/auth/ParticipantRegistrationFields";
import { AccountDeleteButton } from "@/components/auth/AccountDeleteButton";
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        q?: string;
        page?: string;
        disimpan?: string;
    }>;
}) {
    const user = await requireTechnicianUser();
    const { q = "", page: rawPage, disimpan } = await searchParams;
    const page = Math.max(1, Math.min(100000, Number.parseInt(rawPage ?? "1", 10) || 1));
    const { people, total, technicians, outlets } = await apiRequest<Response5>(`teknisi/people?q=${encodeURIComponent(q)}&page=${page}`);
    return <><PageHeader title="Akun Teknisi" description="Satu akun teknisi untuk setiap outlet. Login menggunakan NIP PTH01, PTH02, dan seterusnya."/>{disimpan === "1" && <p role="status" className="mb-5 rounded-xl bg-success-soft p-3 text-sm text-success">Akun teknisi berhasil diperbarui. NIP tetap sama.</p>}<div className="grid gap-6 xl:grid-cols-3">{user.canManage && <Card className="h-fit"><CardTitle>Daftarkan teknisi</CardTitle>{outlets.length ? <ActionForm action={registerTeknisiParticipant} className="mt-5" submit="Daftarkan Teknisi"><ParticipantRegistrationFields /><Choice name="outletId" label="Outlet" required><option value="">Pilih outlet tanpa teknisi</option>{outlets.map(outlet => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}</Choice><Field name="specialty" label="Keahlian (opsional)" required={false} value="Servis HP"/></ActionForm> : <p className="mt-4 text-sm text-foreground/60">Tidak ada outlet kosong. <Link href="/admin/teknisi/outlet" className="text-accent">Tambahkan outlet</Link> sebelum mendaftarkan teknisi.</p>}</Card>}<Card className={user.canManage ? "xl:col-span-2" : "xl:col-span-3"}><form className="mb-5 flex gap-3"><Input name="q" defaultValue={q} aria-label="Cari teknisi" placeholder="Nama, NIP, atau nomor HP"/><button className={buttonVariants({ variant: "secondary" })}>Cari</button></form><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-foreground/50"><tr>{["Teknisi / NIP", "Outlet", "Alamat / HP", "Tiket aktif", ...(user.canManage ? ["Aksi"] : [])].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{people.map(person => { const tech = technicians.find(item => item.userId === person.userId); return <tr key={person.id}><td className="p-3">{person.user.name}<p className="mt-1 font-mono text-xs text-accent">{person.nip}</p>{!person.user.isActive && <p className="text-xs text-red-400">Nonaktif</p>}</td><td className="p-3">{tech?.outlet.name ?? "Belum ditempatkan"}<p className="mt-1 text-xs text-foreground/60">{tech?.specialty}</p></td><td className="max-w-xs p-3">{person.address}<p className="mt-1 text-xs text-foreground/60">{person.phone}</p></td><td className="p-3">{tech?._count.tickets ?? 0}</td>{user.canManage && <td className="p-3"><div className="flex gap-2"><Link href={`/admin/teknisi/teknisi/${person.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>Edit</Link><AccountDeleteButton name={person.user.name} action={deleteTeknisiAccount.bind(null, person.id)}/></div></td>}</tr>; })}</tbody></table>{!people.length && <p className="py-8 text-sm text-foreground/50">Belum ada akun teknisi yang sesuai.</p>}</div><div className="mt-5 flex justify-between text-sm text-foreground/60"><span>{total} teknisi · Halaman {page}</span><div className="flex gap-3">{page > 1 && <Link href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>Sebelumnya</Link>}{page * 25 < total && <Link href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>Berikutnya</Link>}</div></div></Card></div></>;
}
