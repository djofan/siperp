import Link from "next/link";
import { listMaterials } from "../api/materials";
import { getExamNotifications } from "../api/notifications";

export async function TodayLearning({ profileId }: { profileId?: string }) {
  if (!profileId) return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-semibold">Mulai belajar</h2><p className="mt-2 text-sm">Bergabung ke angkatan yang dibuka untuk melihat materi dan ujian Anda.</p><Link href="/academy/angkatan" className="mt-3 inline-block text-sm font-medium text-green-700 underline">Pilih angkatan</Link></section>;
  const [materials, reminders] = await Promise.all([
    listMaterials("", 1, false, "", "", false, true),
    getExamNotifications(profileId),
  ]);
  const next = reminders.filter(item => item.state !== "missed").sort((a, b) =>
    (a.closesAt ? new Date(a.closesAt).getTime() : new Date(a.opensAt).getTime()) -
    (b.closesAt ? new Date(b.closesAt).getTime() : new Date(b.opensAt).getTime()),
  ).slice(0, 3);
  return <section aria-label="Kegiatan hari ini" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
    <h2 className="font-semibold text-slate-900">Kegiatan hari ini</h2>
    <p className="mt-1 text-sm text-slate-600">Mulai dari materi terbaru, lalu periksa ujian dan tenggat Anda.</p>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl bg-white p-4"><h3 className="text-sm font-semibold">Materi terbaru</h3>
        {materials.items.length ? <ul className="mt-3 divide-y divide-gray-100">{materials.items.slice(0, 3).map(item => <li key={item.id} className="py-3">
          <Link href={`/academy/materi/${item.id}`} className="break-words text-sm font-medium text-green-700 hover:underline">{item.title}</Link>
          <p className="mt-1 text-xs text-gray-500">{item.chapter.course.cohort?.title ?? "Angkatan saya"}</p>
        </li>)}</ul> : <p className="mt-3 text-sm text-gray-600">Belum ada materi dari pengajar untuk angkatan Anda. Periksa kembali setelah materi dipublikasikan.</p>}
        <Link href="/academy/materi" className="mt-3 inline-block text-sm text-green-700 underline">Semua materi</Link>
      </div>
      <div className="rounded-xl bg-white p-4"><h3 className="text-sm font-semibold">Ujian & tenggat terdekat</h3>
        {next.length ? <ul className="mt-3 divide-y divide-gray-100">{next.map(item => <li key={item.key} className="py-3">
          <Link href={`/academy/kuis/${item.quizId}`} className="break-words text-sm font-medium text-green-700 hover:underline">{item.title}</Link>
          <p className="mt-1 text-xs text-gray-600">{item.state === "upcoming" ? "Akan datang" : "Tersedia"} · {item.state === "upcoming" ? "Mulai" : "Tutup"}: {new Date(item.state === "upcoming" ? item.opensAt : item.closesAt ?? item.opensAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>
          {item.state === "due" && <p className="mt-1 text-xs font-medium text-amber-800">Tenggat kurang dari 24 jam</p>}
        </li>)}</ul> : <p className="mt-3 text-sm text-gray-600">Tidak ada ujian yang perlu dikerjakan dalam pengingat terdekat. Anda dapat melanjutkan materi belajar.</p>}
        <Link href="/academy/kuis" className="mt-3 inline-block text-sm text-green-700 underline">Semua ujian & hasil</Link>
      </div>
    </div>
  </section>;
}
