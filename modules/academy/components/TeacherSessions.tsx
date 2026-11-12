import Link from "next/link";
import { academyPage } from "../api/page-data";
import type { AcademyTeacherSessionList } from "@/contracts/modules/academy";
import { createTeacherLiveSession } from "../api/teacher-actions";
import { ActionForm } from "./ActionForm";
import { inputClass } from "./ui";

export async function TeacherSessions({ page, saved }: { page: number; saved: boolean }) {
  const { courses, sessions } = await academyPage<AcademyTeacherSessionList>(`academy/teacher/sessions?page=${page}`);
  const href = (target: number) => `/academy/pengajar/pertanyaan?tab=jadwal&page=${target}`;
  return <div className="space-y-6">
    {saved && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">Jadwal sesi berhasil dibuat. Peserta yang mengikuti program ini dapat melihat jadwal dan tautan pertemuannya.</p>}
    <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-semibold">Buat jadwal sesi tanya jawab</h2>
      <p className="mt-2 text-sm text-gray-500">Untuk pertemuan langsung melalui Zoom, Google Meet, atau layanan sejenis. Pertanyaan tertulis tetap tersedia di tab Pertanyaan peserta.</p>
      {!courses.length ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm">Belum ada kurikulum angkatan. Minta admin menyiapkan angkatan dan bab terlebih dahulu.</p> : <ActionForm className="mt-5 max-w-2xl" action={createTeacherLiveSession} label="Simpan jadwal">
        <label className="block text-sm">Angkatan / Program<select name="courseId" required defaultValue="" className={inputClass}><option value="" disabled>Pilih angkatan / program</option>{courses.map(course => <option key={course.id} value={course.id}>{course.cohort?.title ?? course.title}{course.cohort && course.cohort.title !== course.title ? ` - ${course.title}` : ""}</option>)}</select></label>
        <label className="block text-sm">Judul sesi<input name="title" required maxLength={191} className={inputClass} placeholder="Contoh: Diskusi materi pekan pertama"/></label>
        <label className="block text-sm">Tanggal & jam mulai (WIB)<input name="startsAt" type="datetime-local" required className={inputClass}/></label>
        <label className="block text-sm">Tautan pertemuan<input name="joinUrl" type="url" required maxLength={2048} className={inputClass} placeholder="https://meet.google.com/..."/></label>
        <p className="text-xs text-gray-500">Pilih waktu yang akan datang. Gunakan tautan HTTPS dari penyedia pertemuan; sistem tidak membuat ruang pertemuan secara otomatis.</p>
      </ActionForm>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white"><div className="border-b p-5"><h2 className="font-semibold">Jadwal sesi tersimpan</h2><p className="mt-1 text-sm text-gray-500">{sessions.total} sesi · Waktu ditampilkan dalam WIB.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr>{["Sesi", "Angkatan / Program", "Mulai (WIB)", "Tautan"].map(label => <th key={label} scope="col" className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody className="divide-y">{sessions.items.map(session => <tr key={session.id}><td className="max-w-xs break-words px-5 py-4 font-medium">{session.title}</td><td className="px-5 py-4">{session.course.cohort?.title ?? session.course.title}</td><td className="px-5 py-4">{new Date(session.startsAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td><td className="px-5 py-4"><a href={session.joinUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 underline">Buka pertemuan</a></td></tr>)}{!sessions.items.length && <tr><td colSpan={4} className="p-10 text-center text-gray-500">Belum ada jadwal sesi. Isi formulir di atas untuk membuat jadwal pertama.</td></tr>}</tbody>
      </table></div>
      <nav aria-label="Halaman jadwal sesi" className="flex items-center justify-between border-t p-5 text-sm"><p>Halaman {sessions.page} dari {sessions.pages}</p><div className="flex gap-3">{sessions.page > 1 && <Link href={href(sessions.page - 1)} className="text-green-700 underline">Sebelumnya</Link>}{sessions.page < sessions.pages && <Link href={href(sessions.page + 1)} className="text-green-700 underline">Berikutnya</Link>}</div></nav>
    </section>
  </div>;
}
