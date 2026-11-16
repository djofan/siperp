"use client";

import { useState } from "react";
import { Download, FileCheck2, LoaderCircle } from "lucide-react";
import type { AidDetail } from "@/contracts/modules/bantuan";
import { certificateTemplates, createCertificate, type CertificateTemplate } from "../certificate";
import s from "./CertificateBuilder.module.css";

export function CertificateBuilder({ row, verifier, defaultOpen=false }: { defaultOpen?:boolean; row: AidDetail; verifier: string }) {
  const matching = (Object.keys(certificateTemplates) as CertificateTemplate[]).find(key => certificateTemplates[key].toLowerCase() === row.program.toLowerCase());
  const [template, setTemplate] = useState<CertificateTemplate | "">(matching ?? "");
  const [recipient, setRecipient] = useState(row.name);
  const [officer, setOfficer] = useState(verifier);
  const [amount, setAmount] = useState(String(row.amount ?? ""));
  const date = row.disbursedAt ?? "";
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function download() {
    setError("");
    if (!date) { setError("Tanggal belum tercatat. Minta Bendahara melengkapi tanggal transfer ke penyalur."); return; }
    if (!template) { setError("Pilih template sesuai program bantuan."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/bantuan/certificates/${template}.pdf`);
      if (!response.ok) throw new Error("Template belum dapat dimuat. Silakan coba lagi.");
      const bytes = await createCertificate({ template, recipient, verifier: officer, amount: Number(amount), date }, await response.arrayBuffer());
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const link = document.createElement("a"); link.href = url; link.download = `Sertifikat-${row.number}.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (cause) { setError(cause instanceof Error && !cause.message.includes("WinAnsi") ? cause.message : "Ada karakter nama yang belum didukung template. Gunakan huruf Latin."); }
    finally { setBusy(false); }
  }
  return <details id="handover-certificate" open={defaultOpen||undefined} className={s.panel} style={{scrollMarginTop:110}}>
    <summary><FileCheck2 size={20}/><span><strong>Buat sertifikat penyerahan</strong><small>Isi data, unduh PDF, lalu cetak untuk penyerahan bantuan.</small></span></summary>
    <div className={s.body}>
      <div className={s.grid}>
        <label>Template bantuan<select value={template} onChange={event => setTemplate(event.target.value as CertificateTemplate)}><option value="">Pilih template</option>{Object.entries(certificateTemplates).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className={s.dateField}>Tanggal<input type="date" value={date} readOnly aria-describedby="certificate-received-date-help"/><small id="certificate-received-date-help">Tanggal pada sertifikat mengikuti tanggal transfer Bendahara ke penyalur.</small></label>
        <label>Nama penerima manfaat<input maxLength={80} value={recipient} onChange={event => setRecipient(event.target.value)}/></label>
        <label>Nama verifikator<input maxLength={80} value={officer} onChange={event => setOfficer(event.target.value)}/></label>
        <label>Nominal pada sertifikat (Rp)<input inputMode="numeric" value={amount ? Number(amount).toLocaleString("id-ID") : ""} onChange={event => setAmount(event.target.value.replace(/\D/g, "").slice(0,13))}/></label>
      </div>
      <p>Periksa nama, nominal, dan tanggal sebelum dicetak. Unduh sertifikat tidak mengubah nominal maupun status pengajuan. Foto sertifikat saat penyerahan tetap diunggah di bagian bukti.</p>
      {!date && <p className={s.error}>Tanggal transfer Bendahara belum tercatat. Lengkapi pencairan sebelum membuat sertifikat.</p>}
      {error && <p role="alert" className={s.error}>{error}</p>}
      <button type="button" disabled={busy || !date} onClick={download}>{busy ? <LoaderCircle size={17}/> : <Download size={17}/>} {busy ? "Membuat PDF…" : "Unduh sertifikat PDF"}</button>
    </div>
  </details>;
}
