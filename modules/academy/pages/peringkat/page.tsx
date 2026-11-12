import { requireAcademyProfile } from "../../api/access";
import { getOwnRankings } from "../../api/courses";
import { PageHeading, EmptyState } from "../../components/ui";

function durationLabel(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)} menit ${seconds % 60} detik`;
}
const finishedFormat = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta", hourCycle: "h23" });

export default async function RankingPage() {
  const { profileId } = await requireAcademyProfile();
  const rankings = await getOwnRankings(profileId);
  return <div className="mx-auto max-w-6xl p-4 md:p-8">
    <PageHeading title="Peringkat">Urutan berdasarkan nilai tertinggi, durasi pengerjaan terpendek, waktu selesai paling awal, lalu abjad nama.</PageHeading>
    {!rankings.length ? <EmptyState>Peringkat belum tersedia.</EmptyState> : <div className="space-y-6">{rankings.map(item => <section key={item.cohortId ?? item.courseId} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" aria-label={`Peringkat ${item.title}`}>
      <h2 className="border-b border-gray-100 p-5 font-semibold sm:px-6">{item.title}</h2>
      {item.rank !== null && <div className="m-5 grid gap-5 rounded-xl bg-green-50/60 p-4 sm:mx-6 sm:grid-cols-2">
        <div><p className="text-sm text-gray-500">Peringkat Anda</p><p className="mt-2 text-3xl font-bold text-green-700">{item.rank}<span className="ml-2 text-sm font-normal text-gray-500">dari {item.total} peserta</span></p></div>
        <div><p className="text-sm text-gray-500">Nilai</p><p className="mt-2 text-3xl font-bold">{item.score.toFixed(2)}</p><p className="mt-2 text-sm font-semibold text-green-700">{item.predicate}</p><p className="mt-2 text-xs text-gray-500">{item.finalCompleted ? "Hasil akhir" : "Sementara"}</p></div>
      </div>}
      <p className="px-5 pb-4 text-xs leading-5 text-gray-500 sm:px-6">Ujian yang belum dikerjakan dihitung nol dan memakai batas durasi penuh. Waktu selesai ditampilkan setelah seluruh ujian selesai.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
        <caption className="sr-only">Daftar seluruh peserta {item.title} menurut urutan peringkat</caption>
        <thead className="bg-gray-50 text-gray-600"><tr>{["Peringkat", "Peserta", "Nilai", "Durasi pengerjaan", "Waktu selesai (WIB)"].map(label => <th key={label} scope="col" className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{item.participants.map(person => <tr key={person.rank} className={person.isSelf ? "bg-green-50" : undefined}>
          <td className="px-5 py-4 font-semibold">{person.rank}</td>
          <th scope="row" className="px-5 py-4 font-medium"><span className="break-words">{person.name}</span>{person.isSelf && <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Anda</span>}</th>
          <td className="px-5 py-4 font-semibold">{person.score.toFixed(2)}</td>
          <td className="px-5 py-4 whitespace-nowrap">{durationLabel(person.durationMs)}</td>
          <td className="px-5 py-4 whitespace-nowrap">{person.finishedAt ? <time dateTime={person.finishedAt.toISOString()}>{finishedFormat.format(person.finishedAt)}</time> : "Belum selesai"}</td>
        </tr>)}{!item.participants.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-500">Belum ada peserta aktif.</td></tr>}</tbody>
      </table></div>
    </section>)}</div>}
  </div>;
}
