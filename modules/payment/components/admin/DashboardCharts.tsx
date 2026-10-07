"use client";
import { useId, useState } from "react";
import { usePersistedPreference } from "@/lib/usePersistedPreference";
import type { ChartSummary } from "@/modules/payment/api/chartData";
import { panelClasses } from "@/components/ui/panel";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const short = (n: number) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const dateLabel = (date: string) => new Date(`${date}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });

export function DashboardCharts({ periods, moduleSource }: { periods: ChartSummary[]; moduleSource: "lazsip" | "sarsip" }) {
  // Periode grafik diingat per modul supaya tidak balik ke 30 hari saat refresh.
  const [daysValue, setDaysValue] = usePersistedPreference<string>(
    `${moduleSource}-admin-dashboard:days`,
    periods.map((p) => String(p.days)),
    periods.some((p) => p.days === 30) ? "30" : String(periods[0]?.days ?? 30)
  );
  const days = Number(daysValue);
  const setDays = (next: number) => setDaysValue(String(next));
  const [selected, setSelected] = useState<number | null>(null);
  const gradient = useId();
  const data = periods.find(p => p.days === days)!;
  const color = moduleSource === "sarsip" ? "#f97316" : "#10b981";
  const max = Math.max(1, ...data.daily.map(d => d.amount));
  const x = (i: number) => 58 + i * 620 / (data.daily.length - 1);
  const y = (n: number) => 188 - n / max * 150;
  const line = data.daily.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.amount)}`).join(" ");
  const active = data.daily[selected ?? data.daily.length - 1];
  const total = data.statuses.paid + data.statuses.pending + data.statuses.failed;
  const paidAngle = total ? data.statuses.paid / total * 360 : 0;
  const pendingAngle = total ? data.statuses.pending / total * 360 : 0;
  const statusList = [{ key: "paid", label: "Lunas", color: "#10b981" }, { key: "pending", label: "Menunggu", color: "#f59e0b" }, { key: "failed", label: "Gagal", color: "#f43f5e" }] as const;
  return <section aria-label="Grafik transaksi" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Analitik pembayaran</h2><p className="text-xs text-slate-500 dark:text-slate-400">Dana lunas tanpa biaya admin · WIB · termasuk simulasi/sandbox</p></div><div aria-label="Periode grafik" className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/10">{periods.map(p => <button type="button" key={p.days} aria-pressed={days === p.days} onClick={() => { setDays(p.days); setSelected(null); }} className={`rounded-full px-4 py-2 text-xs font-semibold ${days === p.days ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300"}`}>{p.days} hari</button>)}</div></div>
    <div className="grid gap-4 sm:grid-cols-3">{[{ label: "Dana masuk", value: rupiah(data.amount) }, { label: "Donatur unik", value: data.donors.toLocaleString("id-ID") }, { label: "Transaksi lunas", value: data.transactions.toLocaleString("id-ID") }].map(item => <div key={item.label} className={panelClasses("p-5")}><p className="text-xs text-slate-500 dark:text-slate-400">{item.label} · {days} hari</p><p className="mt-2 break-words text-2xl font-bold">{item.value}</p></div>)}</div>
    <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
      <div className={panelClasses("min-w-0 p-5")}><h3 className="font-semibold">Tren dana masuk</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dateLabel(active.date)}: {rupiah(active.amount)} · {active.transactions} transaksi</p>
        <svg viewBox="0 0 700 225" className="mt-4 w-full" role="img" aria-label={`Tren dana masuk ${days} hari, total ${rupiah(data.amount)}`}><defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color} stopOpacity="0.28"/><stop offset="1" stopColor={color} stopOpacity="0.02"/></linearGradient></defs>{[0, .5, 1].map(r => <g key={r}><line x1="58" x2="678" y1={y(max * r)} y2={y(max * r)} stroke="currentColor" opacity=".1"/><text x="48" y={y(max * r) + 4} textAnchor="end" fill="currentColor" fontSize="11">{short(max * r)}</text></g>)}<path d={`${line} L678,188 L58,188 Z`} fill={`url(#${gradient})`}/><path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round"/>{data.daily.map((d, i) => <circle key={d.date} cx={x(i)} cy={y(d.amount)} r={selected === i ? 5 : 3} fill={color}><title>{`${dateLabel(d.date)}: ${rupiah(d.amount)}`}</title></circle>)}{[0, Math.floor((days - 1) / 2), days - 1].map(i => <text key={i} x={x(i)} y="214" textAnchor={i === 0 ? "start" : i === days - 1 ? "end" : "middle"} fill="currentColor" fontSize="11">{dateLabel(data.daily[i].date)}</text>)}</svg>
        {!data.amount && <p className="text-sm text-slate-500">Belum ada pembayaran lunas pada periode ini.</p>}
        <label className="mt-2 block text-xs text-slate-500 dark:text-slate-400">Lihat rincian tanggal<input aria-label="Tanggal pada grafik" type="range" min={0} max={days - 1} value={selected ?? days - 1} onChange={e => setSelected(Number(e.target.value))} className="mt-2 block w-full" style={{ accentColor: color }}/></label>
      </div>
      <div className={panelClasses("p-5")}><h3 className="font-semibold">Status transaksi</h3><div role="img" aria-label={statusList.map(s => `${s.label}: ${data.statuses[s.key]}`).join(", ")} className="mx-auto my-6 flex h-36 w-36 items-center justify-center rounded-full" style={{ background: total ? `conic-gradient(#10b981 0deg ${paidAngle}deg,#f59e0b ${paidAngle}deg ${paidAngle + pendingAngle}deg,#f43f5e ${paidAngle + pendingAngle}deg 360deg)` : "#94a3b8" }}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900"><strong className="text-2xl">{total}</strong><span className="text-xs text-slate-500">transaksi</span></div></div><ul className="space-y-3 text-sm">{statusList.map(s => <li key={s.key} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }}/><span className="flex-1">{s.label}</span><strong>{data.statuses[s.key]}</strong></li>)}</ul></div>
    </div>
    <div className={panelClasses("min-w-0 p-5")}><h3 className="font-semibold">Donatur aktif per hari</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Dihitung sekali per hari dari pembayaran lunas. Donatur yang sama dapat muncul pada beberapa hari.</p><div className="mt-5 flex h-32 items-end gap-1" role="img" aria-label={`Donatur unik dalam periode: ${data.donors}`}>{data.daily.map(d => <div key={d.date} className="group relative flex h-full min-w-0 flex-1 items-end"><div className="w-full rounded-t" style={{ height: `${d.donors / Math.max(1, ...data.daily.map(v => v.donors)) * 100}%`, background: color, minHeight: d.donors ? 3 : 0 }} title={`${dateLabel(d.date)}: ${d.donors} donatur`}/></div>)}</div><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{dateLabel(data.daily[0].date)}</span><span>{dateLabel(data.daily[days - 1].date)}</span></div>
      <details className="mt-5 text-sm"><summary className="cursor-pointer font-medium">Lihat data harian</summary><div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-left"><thead><tr><th className="p-2">Tanggal</th><th className="p-2">Dana masuk</th><th className="p-2">Donatur</th><th className="p-2">Lunas</th></tr></thead><tbody>{data.daily.map(d => <tr key={d.date} className="border-t border-slate-200 dark:border-white/10"><td className="p-2">{dateLabel(d.date)}</td><td className="p-2">{rupiah(d.amount)}</td><td className="p-2">{d.donors}</td><td className="p-2">{d.transactions}</td></tr>)}</tbody></table></div></details>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400">Transaksi lunas mengikuti tanggal pembayaran; transaksi menunggu/gagal mengikuti tanggal dibuat. Riwayat lama tanpa tanggal pembayaran memakai tanggal dibuat.{moduleSource === "lazsip" && ` Komposisi dana: zakat ${rupiah(data.funds.zakat)}, donasi ${rupiah(data.funds.donation)}.`}</p>
  </section>;
}
