import { requireAcademyProfile } from "../../api/access";
import { getOwnRankings } from "../../api/courses";
import { PageHeading, EmptyState } from "../../components/ui";
export default async function RankingPage() {
  const { profileId } = await requireAcademyProfile();
  const rankings = await getOwnRankings(profileId);
  return <div className="mx-auto max-w-4xl p-4 md:p-8"><PageHeading title="Peringkat saya">Posisi Anda di program yang diikuti, berdasarkan nilai berbobot. Nilai yang sama mendapat peringkat yang sama.</PageHeading>{!rankings.length ? <EmptyState>Belum ada program yang diikuti.</EmptyState> : <div className="space-y-4">{rankings.map(item => <article key={item.courseId} className="rounded-2xl border border-gray-100 bg-white p-6"><h2 className="font-semibold">{item.title}</h2>{item.rank === null ? <p className="mt-4 text-sm text-gray-500">Kerjakan ujian untuk melihat peringkat Anda.</p> : <div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="text-sm text-gray-500">Peringkat Anda</p><p className="mt-2 text-3xl font-bold text-green-700">#{item.rank}<span className="ml-2 text-sm font-normal text-gray-500">dari {item.total} peserta yang sudah ujian</span></p></div><div><p className="text-sm text-gray-500">Nilai berbobot</p><p className="mt-2 text-3xl font-bold">{item.score.toFixed(2)}</p><p className="mt-2 text-xs text-gray-500">{item.complete ? "Seluruh ujian sudah dikerjakan." : "Sementara; ujian yang belum dikerjakan dihitung nol."}</p></div></div>}</article>)}</div>}</div>;
}
