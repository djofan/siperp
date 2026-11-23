"use client";
import { formatNumericText } from "@/lib/number-format";


import { useEffect, useState } from "react";
import Link from "@/modules/academy/pwa/AcademyNavigation";
import type { AcademyToday } from "@/contracts/modules/academy-today";
import { currentActivity } from "../today-window";

const format = (value: string) => new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function TodayActivities({ initial }: { initial: AcademyToday }) {
  const [feed, setFeed] = useState(initial);
  const [now, setNow] = useState(() => Date.parse(initial.serverNow));
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true, busy = false;
    const controller = new AbortController();
    const received = performance.now(), server = Date.parse(feed.serverNow);
    const clock = () => server + performance.now() - received;
    const tick = setInterval(() => setNow(clock()), 1000);
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch("/api/academy/learning/today", { cache: "no-store", credentials: "same-origin", signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error();
        const body = await response.json();
        if (!body.data || !Number.isFinite(Date.parse(body.data.serverNow))) throw new Error();
        if (live) { setFeed(body.data); setNow(Date.parse(body.data.serverNow)); setError(false); }
      } catch { if (live) setError(true); }
      finally { busy = false; }
    };
    const polling = setInterval(() => void refresh(), 60000);
    const remaining = feed.nextChangeAt ? Date.parse(feed.nextChangeAt) - clock() : 0;
    const boundary = remaining > 0 ? setTimeout(() => { setNow(clock()); void refresh(); }, Math.min(remaining + 30, 2147483647)) : null;
    const visible = () => { if (document.visibilityState === "visible") { setNow(clock()); void refresh(); } };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => { live = false; controller.abort(); clearInterval(tick); clearInterval(polling); if (boundary !== null) clearTimeout(boundary); document.removeEventListener("visibilitychange", visible); window.removeEventListener("focus", visible); };
  }, [feed]);
  const material = currentActivity(feed.material, now), exam = currentActivity(feed.exam, now);
  return <section aria-label="Kegiatan hari ini" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
    <h2 className="font-semibold text-slate-900">Kegiatan hari ini</h2>
    <div className="mt-4 grid gap-4 lg:grid-cols-2" aria-live="polite">
      <div className="rounded-xl bg-white p-4"><h3 className="text-sm font-semibold">Ujian berlangsung</h3>
        {exam ? <div className="mt-3"><Link href={`/academy/kuis/${exam.id}`} className="break-words text-sm font-medium text-green-700 hover:underline">{exam.title}</Link><p className="mt-2 text-xs text-gray-600">Berakhir: {format(exam.closesAt)} WIB</p>{exam.completed && <p className="mt-2 text-sm text-green-800">Ujian sudah selesai · lihat hasil ujian</p>}</div> : <p className="mt-3 text-sm text-gray-600">Tidak ada ujian yang sedang berlangsung.</p>}
        <Link href="/academy/kuis" className="mt-3 inline-block text-sm text-green-700 underline">Semua ujian & hasil</Link>
      </div>
      <div className="rounded-xl bg-white p-4"><h3 className="text-sm font-semibold">Materi hari ini</h3>
        {material ? <div className="mt-3"><p className="mb-1 text-xs text-gray-600">Materi {formatNumericText(material.number)}</p><Link href={`/academy/materi/${material.id}`} className="break-words text-sm font-medium text-green-700 hover:underline">{material.title}</Link><p className="mt-2 text-xs text-gray-600">Tampil sampai: {format(material.closesAt)} WIB</p></div> : <p className="mt-3 text-sm text-gray-600">Tidak ada materi yang sedang dijadwalkan di beranda.</p>}
        <Link href="/academy/materi" className="mt-3 inline-block text-sm text-green-700 underline">Semua materi</Link>
      </div>
    </div>
    <p className="mt-3 text-xs text-gray-600">Materi dan riwayat ujian tetap tersedia pada menu masing-masing selama masih dipublikasikan.</p>
    {error && <p role="status" className="mt-2 text-xs text-amber-800">Jadwal belum dapat diperbarui. Silakan muat ulang halaman.</p>}
  </section>;
}
