import Link from "next/link";
import { getTransparency } from "@/modules/sarsip/api/beneficiaries";
import { money } from "@/modules/sarsip/api/data";
export async function Transparency() {
  const stats = await getTransparency();
  return <section id="transparansi" className="scroll-mt-32 bg-slate-950 text-white">
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="inline-block rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-200">Transparansi</p>
      <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">Dikelola amanah, dilaporkan terbuka.</h2>
      <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Dukungan Anda membantu tim hadir bagi sesama. Ringkasan ini menampilkan angka agregat untuk menjaga privasi donatur dan penerima manfaat.</p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{[
        [money(stats.totalAmount), "Total dana terkumpul", "Rp"],
        [stats.donorCount.toLocaleString("id-ID"), "Donatur berkontribusi", "↗"],
        [stats.beneficiaryCount.toLocaleString("id-ID"), "Penerima manfaat terbantu", "♡"],
      ].map(([value, label, icon]) => <div key={label} className="rounded-3xl bg-white p-7 text-slate-900"><span aria-hidden="true" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-900">{icon}</span><p className="mt-5 break-words text-3xl font-bold">{value}</p><p className="mt-2 text-sm text-slate-500">{label}</p></div>)}</div>
      <p className="mt-5 text-xs leading-6 text-slate-400">Dana berasal dari pembayaran berstatus berhasil, tanpa biaya admin. Donatur dihitung sekali berdasarkan identitas donatur. Penerima manfaat sesuai data aktif yang dicatat admin. Pembayaran saat ini masih dalam tahap simulasi.</p>
      <div className="mt-12 flex flex-wrap items-center justify-between gap-5 border-t border-white/15 pt-8"><p className="text-lg font-bold">Ambil bagian dalam misi kemanusiaan SARSIP.</p><Link href="/sarsip/campaign" className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 hover:bg-orange-100">Lihat campaign ↗</Link></div>
    </div>
  </section>;
}
