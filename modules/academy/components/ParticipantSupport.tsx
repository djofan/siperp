import Link from "next/link";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage15 } from "@/modules/academy/api/page-contracts";
import { requireAcademyTeacher } from "../api/access";
import { examOpensAt } from "../api/development-policy";
export async function ParticipantSupport({ compact = false }: {
    compact?: boolean;
}) {
    await requireAcademyTeacher();
    const people = await academyPage<AcademyPage15["people"]>("academy/teacher/support");
    return <section className="mb-8 rounded-2xl border border-amber-100 bg-amber-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Peserta yang perlu dibantu ({people.length})</h2>{compact && <Link href="/academy/pengajar/nilai" className="text-sm text-green-700">Lihat seluruh nilai →</Link>}</div><p className="mt-2 text-xs text-gray-600">Prioritas: batas ujian terlewat, nilai di bawah batas lulus, lalu ujian tersedia yang belum dikerjakan.</p>{!people.length ? <p className="mt-4 text-sm">Belum ada peserta yang memerlukan tindak lanjut berdasarkan ujian yang sudah dibuka.</p> : <ul className="mt-4 divide-y divide-amber-100">{(compact ? people.slice(0, 5) : people).map(person => <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{person.profile.user.name}</p><p className="text-xs text-gray-500">{person.course.title}</p></div><p>{person.missed > 0 && `${person.missed} terlewat · `}{person.low > 0 && `${person.low} belum lulus · `}{person.pending > 0 && `${person.pending} belum dikerjakan`}</p></li>)}</ul>}</section>;
}
