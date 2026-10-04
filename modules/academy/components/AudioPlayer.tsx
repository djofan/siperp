"use client";
import { useEffect, useRef, useState } from "react";
import { safeResourceUrl } from "../api/policy";
export function AudioPlayer({ url, title, lessonId, initialPosition = 0 }: { url: string; title: string; lessonId?: string; initialPosition?: number }) {
  const [error, setError] = useState(false);
  const lastSave = useRef(0);
  const latestPosition = useRef(initialPosition);
  const dirty = useRef(false);
  useEffect(() => {
    const flush = () => {
      if (!lessonId || !dirty.current) return;
      dirty.current = false;
      void fetch("/api/academy/audio-progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId, source: url, position: Math.min(latestPosition.current, 86400) }), keepalive: true }).catch(() => {});
    };
    const visibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", visibility);
    return () => { flush(); window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", visibility); };
  }, [lessonId, url]);
  const persist = (position: number, force = false) => {
    if (!lessonId || !Number.isFinite(position)) return;
    latestPosition.current = position; dirty.current = true;
    if (!force && Date.now() - lastSave.current < 10000) return;
    lastSave.current = Date.now();
    void fetch("/api/academy/audio-progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId, source: url, position: Math.min(position, 86400) }), keepalive: true }).catch(() => {});
  };
  const source = safeResourceUrl(url);
  return <section className="rounded-2xl border border-green-100 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-widest text-green-600">Audio pembelajaran</p><h2 className="mt-2 font-semibold">{title}</h2>{source ? <audio aria-label={title} controls preload="metadata" src={source} onLoadedMetadata={event => { const player = event.currentTarget; if (initialPosition > 0 && initialPosition < player.duration - 2) player.currentTime = initialPosition; }} onTimeUpdate={event => persist(event.currentTarget.currentTime)} onPause={event => persist(event.currentTarget.currentTime, true)} onEnded={() => persist(0, true)} onError={() => setError(true)} className="mt-5 w-full" /> : <p className="mt-4 text-sm">Rekaman sedang disiapkan.</p>}{error && <p role="alert" className="mt-3 text-sm text-red-700">Audio belum dapat diputar. Coba lagi atau hubungi CS.</p>}<p className="mt-4 text-sm text-gray-500">Posisi audio disimpan selama pemutaran dan saat dijeda. Simak audio, tulis catatan, lalu kerjakan evaluasi.</p></section>;
}
