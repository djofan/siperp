"use client";
import { useEffect, useRef, useState } from "react";
import { describeApiProblem } from "@/lib/api-problem";
import { collectTaskRecapExport } from "./task-recap-export";
import s from "./TaskRecap.module.css";

export function TaskRecapExport() {
  const [busy,setBusy] = useState(false), [progress,setProgress] = useState(""), [error,setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function download() {
    if (controller.current) return;
    const request = new AbortController(); controller.current = request;
    setBusy(true); setError("");
    try {
      const result = await collectTaskRecapExport(async <T,>(path:string):Promise<T> => {
        const response = await fetch(path, {cache:"no-store",signal:request.signal,headers:{Accept:"application/json"}});
        const body = await response.json().catch(()=>null);
        if (!response.ok) throw new Error(describeApiProblem(body,response.status,"Progres belum dapat diunduh."));
        if (!body?.data) throw new Error("Data laporan belum tersedia. Silakan coba lagi.");
        return body.data as T;
      }, setProgress);
      setProgress("Menyusun file Excel…");
      const { buildTaskRecapWorkbook } = await import("./task-recap-workbook");
      const bytes = await buildTaskRecapWorkbook(result);
      if (request.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
      const link = document.createElement("a"); link.href = url;
      link.download = `progres-tanwir-${new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())}.xlsx`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
      setProgress("File Excel siap diunduh.");
    } catch (failure) {
      if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : "Unduhan gagal. Silakan coba lagi.");
      setProgress("");
    } finally { controller.current = null; setBusy(false); }
  }
  return <div className={s.export}><button type="button" className={s.exportButton} disabled={busy} onClick={()=>void download()}>{busy?"Menyiapkan Excel…":"Unduh semua progres (Excel)"}</button><p className={s.muted}>Seluruh tugas dan peserta dalam rekap, termasuk yang belum mengumpulkan. Tidak dibatasi filter halaman.</p><p role="status" aria-live="polite">{progress}</p>{error&&<p role="alert" className={s.exportError}>{error}</p>}</div>;
}
