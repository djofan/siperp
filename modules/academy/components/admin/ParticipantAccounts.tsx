import Link from "next/link";
import type { AcademyPage1 } from "../../api/page-contracts";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/FormField";
import { buttonVariants } from "@/components/ui/Button";
import { AccountDeleteButton } from "@/components/auth/AccountDeleteButton";
import { deleteAcademyAccount } from "../../api/participant-registration";

export function ParticipantAccounts({ data, q, cohort, group = "", page, base, groups = false, className }: {
  data: AcademyPage1; q: string; cohort: string; group?: string; page: number; base: string; groups?: boolean; className?: string;
}) {
  const href = (number: number) => base + "?" + new URLSearchParams({ q, cohort, ...(groups ? { group } : {}), page: String(number) });
  return <Card className={className}><CardTitle>{groups ? "Daftar peserta" : "Daftar peserta"}</CardTitle>
    <form action={base} className="my-4 flex flex-wrap gap-3"><Input className="min-w-40 flex-1" name="q" aria-label="Cari peserta" defaultValue={q} placeholder="Nama, NIP, atau nomor HP" />
      {groups && <Select className="w-auto" name="group" aria-label="Grup peserta" defaultValue={group}><option value="">Semua grup</option><option value="IKHWAN">Ikhwan</option><option value="AKHWAT">Akhwat</option></Select>}
      <Select className="w-auto" name="cohort" aria-label="Angkatan peserta" defaultValue={cohort}><option value="">Semua angkatan</option>{data.cohorts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</Select><button className={buttonVariants({ variant: "secondary" })}>Cari</button>
    </form>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-foreground/50"><tr>{["Nama / NIP", "Angkatan", ...(groups ? ["Grup"] : []), "Alamat / HP", "Aksi"].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{data.people.map(person => <tr key={person.id}><td className="p-3">{person.user.name}<p className="mt-1 font-mono text-xs text-accent">{person.nis ?? "Belum memiliki NIP"}</p>{!person.user.isActive && <p className="text-xs text-red-400">Nonaktif</p>}</td><td className="p-3">{person.cohort?.title ?? "Belum ditentukan"}</td>{groups && <td className="p-3">{person.gender === "IKHWAN" ? "Ikhwan" : person.gender === "AKHWAT" ? "Akhwat" : "Belum ditentukan"}</td>}<td className="max-w-xs p-3">{person.address ?? "Belum diisi"}<p className="mt-1 text-xs text-foreground/60">{person.phone}</p></td><td className="p-3"><div className="flex gap-2"><Link href={`/admin/academy/pendaftaran/${person.id}${groups ? "?from=pengguna" : ""}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>Edit</Link><AccountDeleteButton name={person.user.name} action={deleteAcademyAccount.bind(null, person.id)} /></div></td></tr>)}</tbody></table>{!data.people.length && <p className="py-8 text-sm text-foreground/50">Belum ada peserta yang sesuai.</p>}</div>
    <div className="mt-5 flex justify-between text-sm text-foreground/60"><span>{data.total} peserta · Halaman {page}</span><div className="flex gap-3">{page > 1 && <Link href={href(page - 1)}>Sebelumnya</Link>}{page * 25 < data.total && <Link href={href(page + 1)}>Berikutnya</Link>}</div></div>
  </Card>;
}
