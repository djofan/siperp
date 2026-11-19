"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCheck, Copy, FileText, ImagePlus, LoaderCircle, RefreshCw, Trash2, Wallet } from "lucide-react";
import type { AidApplication, BantuanStaff } from "@/contracts/modules/bantuan";
import { money, request } from "../api/client";
import { hasAnyRole } from "../permissions";
import { attachmentAccept, attachmentHint, validateAttachment } from "../attachments";
import { preparePhotoUpload } from "../api/photos";
import { appendPhotoLocation } from "../photo-location";
import { ApplicationList, type ApplicationListProps } from "./ApplicationList";
import s from "./BulkDisbursement.module.css";

type Transfer = { bank: string; account: string; recipientName: string; recipientRelationship: string; file: File | null };
type Props = ApplicationListProps & { selectionKey: string; onSaved: () => void };
const localToday = () => new Date().toLocaleDateString("en-CA");
function initialTransfer(row: AidApplication, staff: BantuanStaff[]): Transfer {
  return { bank: "", account: "", recipientName: row.manualDistributorName ?? staff.find(p => p.id === row.distributorId)?.name ?? "", recipientRelationship: row.distributionType === "direct" ? "Bendahara menyerahkan langsung" : "Penyalur bantuan", file: null };
}
function sameDistributor(a: AidApplication, b: AidApplication) {
  if (a.distributionType !== b.distributionType) return false;
  if (a.distributorId) return a.distributorId === b.distributorId;
  return a.distributionType === "direct" || !!a.manualDistributorName && a.manualDistributorName === b.manualDistributorName;
}

export function BulkDisbursement({ selectionKey, onSaved, ...props }: Props) {
  const { page, viewer, refreshing } = props;
  const eligible = page.data.filter(row => row.status === "fund_approved");
  const allowed = hasAnyRole(viewer, ["admin", "treasurer"]) && eligible.length > 0;
  const [selection, setSelection] = useState<{ key: string; ids: Record<string, boolean> }>({ key: "", ids: {} });
  const selected = selection.key === selectionKey ? selection.ids : {};
  const chosen = eligible.filter(row => selected[row.id]);
  const [rows, setRows] = useState<AidApplication[] | null>(null);
  const [success, setSuccess] = useState("");
  function select(id: string, checked: boolean) { setSelection({ key: selectionKey, ids: { ...selected, [id]: checked } }); }
  return <>
    {allowed && !rows && <section className={s.toolbar} aria-label="Pencairan sekaligus">
      <div className={s.intro}><span className={s.icon}><Wallet size={21}/></span><div><h3>Catat pencairan sekaligus</h3><p>Centang pengajuan yang sudah ditransfer, lalu simpan dalam satu form.</p></div></div>
      <div className={s.controls}><label><input type="checkbox" checked={chosen.length === eligible.length} disabled={refreshing} onChange={event => setSelection({ key: selectionKey, ids: Object.fromEntries(eligible.map(row => [row.id, event.target.checked])) })}/>Pilih semua di halaman ini ({eligible.length})</label><span>{chosen.length} dipilih · {money(chosen.reduce((sum, row) => sum + (row.amount ?? 0), 0))}</span><button className={s.primary} type="button" disabled={!chosen.length || refreshing} onClick={() => { setSuccess(""); setRows([...chosen]); }}><CheckCheck size={17}/>Tandai sudah dicairkan</button></div>
    </section>}
    {success && <p className={s.success} role="status">{success}</p>}
    {!rows && <ApplicationList {...props} selection={allowed ? { ids: selected, onChange: select } : undefined}/>}
    {rows && <TransferForm rows={rows} staff={props.staff} onClose={() => setRows(null)} onReload={() => { setRows(null); setSelection({ key: "", ids: {} }); onSaved(); }} onSaved={() => { setSuccess(`${rows.length} pengajuan sudah dicatat dicairkan. Dana siap disalurkan; penyalur menerima notifikasi sesuai penugasannya.`); setRows(null); setSelection({ key: "", ids: {} }); onSaved(); }}/>} 
  </>;
}

function TransferForm({ rows, staff, onClose, onSaved, onReload }: { rows: AidApplication[]; staff: BantuanStaff[]; onClose: () => void; onSaved: () => void; onReload: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const [transfers, setTransfers] = useState<Record<string, Transfer>>(() => Object.fromEntries(rows.map(row => [row.id, initialTransfer(row, staff)])));
  const [date, setDate] = useState(localToday);
  const [sharedBank, setSharedBank] = useState("");
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [progress, setProgress] = useState("");
  const lock = useRef(false), uploaded = useRef(new Map<string, { file: File; documentId: string }>());
  const total = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  function set(id: string, key: keyof Transfer, value: string | File | null) {
    setTransfers(current => ({ ...current, [id]: { ...current[id], [key]: value } })); setConfirmed(false);
  }
  async function changeFile(id: string, file: File | null) {
    setEvidenceBusy(true);
    try {
      const previous = uploaded.current.get(id);
      if (previous) {
        await request(`documents/${previous.documentId}`, { method: "DELETE" });
        uploaded.current.delete(id);
      }
      set(id, "file", file);
      setError("");
    } finally { setEvidenceBusy(false); }
  }
  function apply(row: AidApplication) {
    const source = transfers[row.id];
    setTransfers(current => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, rows.some(other => other.id === id && sameDistributor(row, other)) ? { ...source, file: value.file } : value])));
    setConfirmed(false);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || evidenceBusy || !confirmed) return;
    lock.current = true; setBusy(true); setError("");
    try {
      for (const [index, row] of rows.entries()) {
        const transfer = transfers[row.id];
        if (!transfer.bank.trim() || !transfer.account.trim() || !transfer.recipientName.trim() || !transfer.recipientRelationship.trim()) throw new Error(`Lengkapi data penerima transfer untuk ${row.name}.`);
        if (row.intakeType === "other" && !transfer.file && !uploaded.current.has(row.id)) throw new Error(`Bukti transfer wajib untuk ${row.name} (Pengajuan lainnya).`);
        if (transfer.file && uploaded.current.get(row.id)?.file !== transfer.file) {
          setProgress(`Mengunggah bukti ${index + 1} dari ${rows.length}…`);
          const { file, location } = await preparePhotoUpload(transfer.file);
          const body = new FormData(); body.set("kind", "transfer"); body.set("file", file); appendPhotoLocation(body, location);
          const document = await request<{ id: string }>(`applications/${row.id}/documents`, { method: "POST", body }); uploaded.current.set(row.id, { file: transfer.file, documentId: document.id });
        }
      }
      setProgress(`Menyimpan ${rows.length} pencairan…`);
      await request("disbursements", { method: "POST", body: JSON.stringify({ transferDate: date, items: rows.map(row => { const transfer = transfers[row.id]; return { id: row.id, version: row.version, transferAmount: row.amount, bank: transfer.bank.trim(), account: transfer.account.trim(), recipientName: transfer.recipientName.trim(), recipientRelationship: transfer.recipientRelationship.trim() }; }) }) });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Pencairan belum tersimpan. Periksa kembali sebelum mencoba lagi."); }
    finally { lock.current = false; setBusy(false); setProgress(""); }
  }
  return <section className={s.workspace} aria-labelledby="bulk-disbursement-title" aria-busy={busy}>
    <header className={s.pageHeader}><div><span className={s.eyebrow}>PENCATATAN PENCAIRAN</span><h2 ref={heading} tabIndex={-1} id="bulk-disbursement-title">Catat transfer, sekaligus.</h2><p>Lengkapi penerima dan rekening untuk pengajuan yang sudah dicairkan.</p></div><button type="button" className={s.cancel} disabled={busy || evidenceBusy} onClick={onClose}><ArrowLeft size={16}/>Kembali ke pilihan</button></header>
    <div className={s.steps} aria-label="Langkah pencairan"><span><CheckCheck size={15}/>1. Pilih pengajuan</span><strong>2. Lengkapi transfer</strong><span>3. Simpan pencairan</span></div>
    <form onSubmit={save}><fieldset disabled={busy || evidenceBusy} className={s.fieldset}>
      <div className={s.summary}><div><small>Pengajuan dipilih</small><strong>{rows.length} pengajuan</strong></div><div><small>Total dicairkan</small><strong>{money(total)}</strong></div><label>Tanggal transfer<input required type="date" max={localToday()} value={date} onChange={event => { setDate(event.target.value); setConfirmed(false); }}/></label></div>
      <p className={s.help}>Nama penyalur sudah diisikan jika tersedia. Bank dan rekening diisi sesuai transfer. Gunakan tombol salin jika beberapa pengajuan memiliki penyalur yang sama.</p>
      <details className={s.sharedBank}><summary>Bank semua transfer sama? Isi sekali</summary><div><label>Nama bank<input maxLength={191} value={sharedBank} onChange={event => setSharedBank(event.target.value)} placeholder="Contoh: Mandiri"/></label><button type="button" className={s.copy} disabled={!sharedBank.trim()} onClick={() => { setTransfers(current => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, { ...value, bank: sharedBank.trim() }]))); setConfirmed(false); }}>Terapkan bank ke semua</button></div></details>
      <div className={s.sectionHeading}><div><h3>Rincian penerima transfer</h3><p>Nominal sesuai persetujuan. Periksa setiap rekening sebelum menyimpan.</p></div><span>{rows.length} pengajuan</span></div>
      <div className={s.rows}>{rows.map((row, index) => { const transfer = transfers[row.id]; const matches = rows.filter(other => other.id !== row.id && sameDistributor(row, other)).length; return <section className={s.row} key={row.id} aria-label={`Transfer ${row.name}`}>
        <header><div><span className={s.index}>{index + 1}</span><div><h3>{row.name}</h3><small>{row.number} · {row.program}</small></div></div><strong>{money(row.amount)}</strong></header>
        <div className={s.routing}><div><small>Jenis pengajuan</small><strong>{row.intakeType === "other" ? "Pengajuan lainnya" : "Bantuan perorangan"}</strong></div><div><small>Tipe penyaluran</small><strong>{row.distributionType === "direct" ? "Bendahara langsung ke penerima" : row.distributionType === "manual" ? "Melalui penyalur manual" : row.distributionType === "verifier" ? "Melalui petugas penyalur" : "Belum ditentukan"}</strong></div></div>
        <div className={s.fields}>
          <label>Nama penerima transfer<input required maxLength={191} autoComplete="off" value={transfer.recipientName} onChange={event => set(row.id, "recipientName", event.target.value)}/></label>
          <label>Hubungan / peran<input required maxLength={191} value={transfer.recipientRelationship} onChange={event => set(row.id, "recipientRelationship", event.target.value)}/></label>
          <label>Bank<input required maxLength={191} placeholder="Contoh: Mandiri" value={transfer.bank} onChange={event => set(row.id, "bank", event.target.value)}/></label>
          <label>Nomor rekening<input required maxLength={191} inputMode="numeric" autoComplete="off" placeholder="Nomor rekening tujuan" value={transfer.account} onChange={event => set(row.id, "account", event.target.value)}/></label>
        </div>
        <div className={s.rowBottom}><TransferEvidence file={transfer.file} required={row.intakeType === "other"} name={row.name} onChange={file => changeFile(row.id, file)} onError={setError}/>
        {matches > 0 && <button className={s.copy} type="button" disabled={!transfer.bank.trim() || !transfer.account.trim() || !transfer.recipientName.trim()} onClick={() => apply(row)}><Copy size={14}/>Salin rekening ke {matches} pengajuan dengan penyalur sama</button>}</div>
      </section>; })}</div>
      <div className={s.review}><label className={s.confirm}><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/>Saya sudah memeriksa penerima, rekening, dan memastikan total {money(total)} telah dicairkan.</label>
      {error && <div className={s.error} role="alert"><p>{error}</p><button type="button" onClick={onReload}>Muat ulang daftar pengajuan</button><small>Data form akan ditutup. Bukti yang sudah diunggah tetap tersimpan.</small></div>}
      </div><footer className={s.footer}><div className={s.footerTotal}><small>Total pencairan · {rows.length} pengajuan</small><strong>{money(total)}</strong></div><button type="button" className={s.cancel} onClick={onClose}>Batal</button><button className={s.primary} disabled={!confirmed || evidenceBusy}>{busy ? <LoaderCircle size={17} className={s.spinner}/> : <CheckCheck size={17}/>} {busy ? progress || "Menyimpan…" : `Simpan ${rows.length} pencairan`}</button></footer>
    </fieldset></form>
  </section>;
}


function TransferEvidence({ file, required, name, onChange, onError }: { file: File | null; required: boolean; name: string; onChange: (file: File | null) => Promise<void>; onError: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [changing, setChanging] = useState(false);
  async function change(next: File | null) {
    setChanging(true);
    try {
      if (next) validateAttachment(next);
      await onChange(next);
    } catch (err) { onError(err instanceof Error ? err.message : "Bukti transfer belum dapat diubah."); }
    finally { if (input.current) input.current.value = ""; setChanging(false); }
  }
  return <div className={s.evidence} aria-label={`Bukti transfer ${name}`} aria-busy={changing}>
    <div className={s.evidenceTitle}><strong>Bukti transfer</strong><span className={required ? s.requiredBadge : s.optionalBadge}>{required ? "Wajib" : "Opsional"}</span></div>
    <input ref={input} type="file" className={s.fileInput} accept={attachmentAccept} aria-label={`Pilih bukti transfer ${name}`} disabled={changing} onChange={event => { const next = event.target.files?.[0]; if (next) void change(next); }}/>
    {file ? <div className={s.evidenceSelected}>
      {file.type.startsWith("image/") && !/hei[cf]/i.test(file.type) ? <EvidencePreview file={file}/> : <span className={s.documentIcon}><FileText size={26}/></span>}
      <div className={s.fileInfo}><strong>{file.name}</strong><small>{file.size >= 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(1) + " MB" : Math.ceil(file.size / 1024) + " KB"} · Siap dilampirkan</small><div className={s.evidenceActions}><button type="button" disabled={changing} onClick={() => input.current?.click()}><RefreshCw size={14}/>Ganti berkas</button><button type="button" className={s.removeEvidence} disabled={changing} onClick={() => void change(null)}><Trash2 size={14}/>Hapus</button></div></div>
    </div> : <button type="button" className={s.uploadArea} disabled={changing} onClick={() => input.current?.click()}><span><ImagePlus size={24}/></span><strong>Pilih foto / dokumen</strong><small>Ketuk untuk menambahkan bukti transfer</small></button>}
    {changing && <small role="status">Memperbarui bukti…</small>}
    <small className={s.evidenceHint}>{attachmentHint}</small>
    {required && !file && <small className={s.evidenceRequired}>Bukti wajib untuk jenis Pengajuan lainnya.</small>}
  </div>;
}
function EvidencePreview({ file }: { file: File }) {
  const preview = useRef<HTMLDivElement>(null);
  useEffect(() => { const url = URL.createObjectURL(file); if (preview.current) preview.current.style.backgroundImage = `url("${url}")`; return () => URL.revokeObjectURL(url); }, [file]);
  return <div ref={preview} role="img" aria-label={`Pratinjau ${file.name}`} className={s.evidencePreview}/>;
}
