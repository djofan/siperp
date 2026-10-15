import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage1 } from "@/modules/academy/api/page-contracts";
import { requireAcademyAdmin } from "../../../api/admin-access";
import { registerAcademyParticipant } from "../../../api/participant-registration";
import { saveCourseSchedule } from "../../../api/intake-actions";
import { quizDateInput } from "../../../api/admin-quiz-validation";
import { ActionForm } from "../../../components/ActionForm";
import { AdminHeading, SavedNotice } from "../../../components/admin/AdminUi";
import { ParticipantRegistrationFields } from "@/components/auth/ParticipantRegistrationFields";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Select, FormField } from "@/components/ui/FormField";
import { buttonVariants } from "@/components/ui/Button";
import Link from "next/link";
import { AccountDeleteButton } from "@/components/auth/AccountDeleteButton";
import { deleteAcademyAccount } from "../../../api/participant-registration";
export default async function IntakePage({ searchParams }: {
    searchParams: Promise<{
        q?: string;
        group?: string;
        page?: string;
        disimpan?: string;
    }>;
}) {
    await requireAcademyAdmin();
    const { q = "", group = "", page: rawPage, disimpan } = await searchParams;
    const page = Math.max(1, Math.min(100000, Number.parseInt(rawPage ?? "1", 10) || 1));
    const { people, total, counts, courses } = await academyPage<AcademyPage1>(`academy/admin/intake?q=${encodeURIComponent(q)}&group=${encodeURIComponent(group)}&page=${page}`);
    const href = (number: number) => `?${new URLSearchParams({ q, group, page: String(number) })}`;
    return <><AdminHeading title="Pendaftaran & Grup" description="Daftarkan peserta menggunakan nama, gender, alamat, dan nomor HP. Grup hanya terdiri dari Ikhwan dan Akhwat."/>
    <SavedNotice saved={disimpan === "1"}/>
    <div className="mb-6 grid gap-4 sm:grid-cols-2">{[["IKHWAN", "Ikhwan"], ["AKHWAT", "Akhwat"]].map(([value, label]) => <a href={`?group=${value}`} key={value}><Card><p className="text-sm text-foreground/60">Grup {label}</p><p className="mt-3 text-3xl font-semibold">{counts.find(item => item.gender === value)?._count._all ?? 0}</p></Card></a>)}</div>
    <div className="grid gap-6 xl:grid-cols-3"><Card className="h-fit"><CardTitle>Daftarkan peserta</CardTitle><ActionForm action={registerAcademyParticipant} label="Daftarkan Peserta" className="mt-5"><ParticipantRegistrationFields academy/><FormField label="Program belajar (opsional)" htmlFor="participant-course"><Select id="participant-course" name="courseId" defaultValue=""><option value="">Daftarkan akun terlebih dahulu</option>{courses.filter(course => course.isPublished && course.registrationOpen && (course.isSimulation || !course.startsAt || course.startsAt > new Date())).map(course => <option key={course.id} value={course.id}>{course.title} · {course._count.enrollments}/{course.quota}</option>)}</Select></FormField></ActionForm></Card>
      <Card className="xl:col-span-2"><CardTitle>Daftar peserta</CardTitle><form className="my-4 flex flex-wrap gap-3"><Input className="min-w-40 flex-1" name="q" aria-label="Cari peserta" defaultValue={q} placeholder="Nama, NIP, atau nomor HP"/><Select className="w-auto" name="group" aria-label="Grup peserta" defaultValue={group}><option value="">Semua grup</option><option value="IKHWAN">Ikhwan</option><option value="AKHWAT">Akhwat</option></Select><button className={buttonVariants({ variant: "secondary" })}>Cari</button></form><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-foreground/50"><tr>{["Nama / NIP", "Grup", "Alamat / HP", "Program", "Aksi"].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{people.map(person => <tr key={person.id}><td className="p-3">{person.user.name}<p className="mt-1 font-mono text-xs text-accent">{person.nis ?? "Belum memiliki NIP"}</p>{!person.user.isActive && <p className="text-xs text-red-400">Nonaktif</p>}</td><td className="p-3">{person.gender === "IKHWAN" ? "Ikhwan" : person.gender === "AKHWAT" ? "Akhwat" : "Belum ditentukan"}</td><td className="max-w-xs p-3">{person.address ?? "Belum diisi"}<p className="mt-1 text-xs text-foreground/60">{person.phone}</p></td><td className="p-3 text-xs">{person.enrollments.map(item => item.course.title).join(", ") || "Belum mengikuti program"}</td><td className="p-3"><div className="flex gap-2"><Link href={`/admin/academy/pendaftaran/${person.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>Edit</Link><AccountDeleteButton name={person.user.name} action={deleteAcademyAccount.bind(null, person.id)}/></div></td></tr>)}</tbody></table>{!people.length && <p className="py-8 text-sm text-foreground/50">Belum ada peserta yang sesuai.</p>}</div><div className="mt-5 flex justify-between text-sm text-foreground/60"><span>{total} peserta · Halaman {page}</span><div className="flex gap-3">{page > 1 && <a href={href(page - 1)}>Sebelumnya</a>}{page * 25 < total && <a href={href(page + 1)}>Berikutnya</a>}</div></div></Card>
    </div>
    <section className="mt-8 space-y-4"><h2 className="text-lg font-semibold">Jadwal program belajar</h2>{courses.map(course => <Card key={course.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{course.title}</h3><p className="mt-2 text-sm text-foreground/60">{course._count.enrollments}/{course.quota} peserta · {course.durationDays} hari</p></div><a href={`/api/academy/contacts?courseId=${course.id}`} className={buttonVariants({ variant: "secondary" })}>Unduh kontak (.vcf)</a></div><details className="mt-4"><summary className="cursor-pointer text-sm text-accent">Atur tanggal mulai pembelajaran</summary><ActionForm className="mt-4 max-w-md" action={saveCourseSchedule.bind(null, course.id)} label="Simpan tanggal mulai"><FormField label="Mulai (WIB)" htmlFor={`starts-${course.id}`}><Input id={`starts-${course.id}`} name="startsAt" type="datetime-local" defaultValue={quizDateInput(course.startsAt)}/></FormField><p className="text-xs text-foreground/60">Program resmi dimulai setelah kuota terpenuhi. Program simulasi dapat dimulai tanpa menunggu kuota.</p></ActionForm></details></Card>)}</section>
  </>;
}
