"use client";
import { useEffect, useState } from "react";
export function ServiceTimer({startedAt}:{startedAt:Date|string|null|undefined}) {
  const [elapsed,setElapsed] = useState<number|null>(null);
  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.max(0,Math.floor((Date.now()-start)/1000)));
    update(); const timer = setInterval(update,1000); return () => clearInterval(timer);
  },[startedAt]);
  if (!startedAt) return <small className="tech-timer">Waktu mulai belum tercatat pada tiket lama.</small>;
  const seconds=elapsed??0, hours=Math.floor(seconds/3600), minutes=Math.floor(seconds%3600/60);
  return <span className="tech-timer">Waktu pengerjaan · {elapsed===null?"…":`${hours}j ${minutes}m ${seconds%60}d`}</span>;
}
