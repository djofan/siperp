import { requireAcademyUser } from "../../api/access";
import { getLeaderboard } from "../../api/courses";
import { PageHeading, LearnerNav, EmptyState } from "../../components/ui";

export default async function LeaderboardPage() {
  const user = await requireAcademyUser();
  const rankings = await getLeaderboard();
  return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><LearnerNav /><PageHeading title="Peringkat peserta">Berdasarkan rata-rata nilai terbaik setiap kuis. Mengulang kuis tidak menambah jumlah kuis yang dihitung.</PageHeading>
    {!rankings.length ? <EmptyState>Belum ada hasil kuis untuk ditampilkan.</EmptyState> : <div className="overflow-x-auto rounded-2xl border border-lazsip-primary-100 bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">Peringkat peserta berdasarkan nilai kuis</caption><thead className="bg-lazsip-primary-50"><tr>{["Peringkat", "Peserta", "Kuis", "Rata-rata"].map((title) => <th key={title} scope="col" className="px-5 py-4">{title}</th>)}</tr></thead><tbody className="divide-y divide-lazsip-primary-50">{rankings.map((item, index) => <tr key={item.id} className={item.id === user.academyProfile?.id ? "bg-lazsip-primary-50" : ""}><td className="px-5 py-4">{index + 1}</td><th scope="row" className="px-5 py-4 font-medium">{item.name}{item.id === user.academyProfile?.id && " (Saya)"}</th><td className="px-5 py-4">{item.total}</td><td className="px-5 py-4 font-bold">{item.average.toFixed(2)}</td></tr>)}</tbody></table></div>}
  </div>;
}
