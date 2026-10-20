import Link from "next/link";
import { academyPage } from "@/modules/academy/api/page-data";
import type { AcademyPage4 } from "@/modules/academy/api/page-contracts";
import { requireAcademyProfile } from "../../api/access";
import { PageHeading, EmptyState } from "../../components/ui";
export default async function NotesPage() {
    await requireAcademyProfile();
    const notes = await academyPage<AcademyPage4["notes"]>("academy/learning/notes");
    return <div className="p-6"><PageHeading title="Catatan belajar">Catatan pribadi Anda untuk murojaah. Pengajar dan peserta lain tidak dapat membacanya.</PageHeading>{notes.length ? <div className="grid gap-4 md:grid-cols-2">{notes.map(note => <article key={note.id} className="rounded-2xl border border-gray-100 bg-white p-5"><p className="text-xs text-gray-500">{note.lesson.chapter.course.title}</p><h2 className="mt-1 font-semibold">{note.lesson.title}</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7">{note.content || "Catatan kosong."}</p><Link href={`/academy/program/${note.lesson.chapter.course.slug}/${note.lesson.slug}`} className="mt-4 inline-block text-sm text-green-700">Buka materi & edit catatan →</Link></article>)}</div> : <EmptyState>Belum ada catatan. Buka materi audio untuk menulis catatan belajar.</EmptyState>}</div>;
}
