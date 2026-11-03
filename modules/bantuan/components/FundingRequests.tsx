"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Copy, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Plus, RefreshCw, Wallet } from "lucide-react";
import { bantuanStatuses, type BantuanViewer } from "@/contracts/modules/bantuan";
import { day, money, request, RequestError } from "../api/client";
import { hasAnyRole } from "../permissions";
import { fundingDescription } from "../funding-requests";
import type { FundingBatch, FundingCandidate, FundingPage } from "../funding-requests";
import s from "./FundingRequests.module.css";

const labels = { submitted: "Sedang diajukan", approved: "Dana disetujui", rejected: "Dana ditolak" };
const empty = <T,>(): FundingPage<T> => ({ data: [], current_page: 1, last_page: 1, summary: { count: 0, totalAmount: 0 } });
const message = (error: unknown) => error instanceof Error ? error.message : "Permintaan belum dapat diproses.";

/** Parent route: /admin/bantuan/pengajuan-dana. Only the viewer prop is required. */
export function FundingRequests({ viewer, onChanged }: { viewer: BantuanViewer; onChanged?: () => void | Promise<void> }) {
  const canRead = hasAnyRole(viewer, ["admin", "fund_requester", "treasurer", "chair"]);
  const canManage = hasAnyRole(viewer, ["admin", "fund_requester"]);
  const [cards, setCards] = useState<FundingPage<FundingBatch>>(empty);
  const [ready, setReady] = useState<FundingPage<FundingCandidate>>(empty);
  const [search, setSearch] = useState(""), [status, setStatus] = useState("");
  const [readySearch, setReadySearch] = useState(""), [program, setProgram] = useState(""), [region, setRegion] = useState("");
  const [page, setPage] = useState(1), [readyPage, setReadyPage] = useState(1), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [readyLoading, setReadyLoading] = useState(true);
  const [error, setError] = useState(""), [readyError, setReadyError] = useState(""), [success, setSuccess] = useState("");
  const [creating, setCreating] = useState(canManage), [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<Record<string, FundingCandidate>>({});
  const [title, setTitle] = useState(""), [notes, setNotes] = useState("");

  useEffect(() => {
    if (!canRead) return;
    let live = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      const query = new URLSearchParams({ search, status, page: String(page) });
      request<FundingPage<FundingBatch>>(`funding-requests?${query}`, { signal: controller.signal }, false)
        .then(data => { if (live) { setCards(data); setError(""); } })
        .catch(err => { if (live) setError(message(err)); })
        .finally(() => { if (live) setLoading(false); });
    }, 250);
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, [canRead, viewer.id, viewer.role, viewer.roles, search, status, page, revision]);

  useEffect(() => {
    if (!canManage || !creating) return;
    let live = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setReadyLoading(true);
      const query = new URLSearchParams({ search: readySearch, program, region, page: String(readyPage) });
      request<FundingPage<FundingCandidate>>(`funding-requests/ready?${query}`, { signal: controller.signal }, false)
        .then(data => { if (live) { setReady(data); setReadyError(""); } })
        .catch(err => { if (live) setReadyError(message(err)); })
        .finally(() => { if (live) setReadyLoading(false); });
    }, 250);
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, [canManage, viewer.id, viewer.role, viewer.roles, creating, readySearch, program, region, readyPage, revision]);

  const selection = Object.values(selected), total = selection.reduce((sum, row) => sum + row.amount, 0);
  function notifyParent() {
    // A parent refresh failure must never turn a committed mutation into a retryable form error.
    try { void Promise.resolve(onChanged?.()).catch(() => undefined); } catch { /* Parent owns its refresh errors. */ }
  }
  function toggle(row: FundingCandidate) {
    setSelected(previous => {
      const next = { ...previous };
      if (next[row.id]) delete next[row.id];
      else if (Object.keys(next).length < 100) next[row.id] = row;
      return next;
    });
  }
  async function selectAll(){
    if(busy)return;setBusy("select-all");setReadyError("");
    try{const all:Record<string,FundingCandidate>={};let current=1,last=1;
      do{const query=new URLSearchParams({search:readySearch,program,region,page:String(current)});
        const batch=await request<FundingPage<FundingCandidate>>(`funding-requests/ready?${query}`,{},false);
        last=batch.last_page;for(const row of batch.data){if(Object.keys(all).length>=100)break;all[row.id]=row;}current++;
      }while(current<=last&&Object.keys(all).length<100);
      setSelected(all);setSuccess(Object.keys(all).length===100?"100 pengajuan pertama dipilih. Maksimal 100 bantuan per grup; sisanya dapat diajukan dalam grup berikutnya.":`${Object.keys(all).length} pengajuan sesuai filter dipilih dari seluruh halaman.`);
    }catch(err){setReadyError(message(err));}finally{setBusy("");}
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !selection.length) return;
    setBusy("create"); setError(""); setSuccess("");
    try {
      await request<FundingBatch>("funding-requests", { method: "POST", body: JSON.stringify({ title, notes,
        items: selection.map(row => ({ id: row.id, version: row.version })) }) });
      setSelected({}); setTitle(""); setNotes(""); setCreating(false); setPage(1); setSearch(""); setStatus("submitted");
      setRevision(value => value + 1); setSuccess("Grup tersimpan sebagai sedang diajukan. Salin rinciannya lalu ajukan di web pengajuan dana.");
      notifyParent();
    } catch (err) {
      setError(message(err));
      if (err instanceof RequestError && [404, 409].includes(err.status)) {
        setSelected({}); setRevision(value => value + 1);
      }
    } finally { setBusy(""); }
  }
  async function decide(row: FundingBatch, decision: "approved" | "rejected", reason: string) {
    if (busy) return;
    setBusy(row.id); setError(""); setSuccess("");
    try {
      const updated = await request<FundingBatch>(`funding-requests/${row.id}/decision`, {
        method: "POST", body: JSON.stringify({ version: row.version, decision, reason: reason || null,
          items: row.items.map(item => ({ id: item.id, version: item.version })) }),
      });
      setCards(previous => ({ ...previous, data: previous.data.map(card => card.id === row.id ? updated : card) }));
      setRevision(value => value + 1); setSuccess(decision === "approved"
        ? "Dana disetujui untuk seluruh isi kartu. Bantuan siap dicairkan oleh Bendahara."
        : "Dana ditolak. Seluruh isi kartu dikembalikan untuk review ulang nominal.");
      notifyParent();
    } catch (err) {
      setError(message(err));
      // Keep the reviewed versions on screen. Refresh is explicit before retrying a conflict.
    } finally { setBusy(""); }
  }

  if (!canRead) return <div className={s.notice} role="alert">Anda tidak memiliki akses ke kartu pengajuan dana.</div>;
  return <main className={s.root}>
    <header className={s.heading}><div><span className={s.eyebrow}>DANA BANTUAN</span><h1>Pengajuan dana</h1><p>Pilih penerima, salin rincian ke web pengajuan dana, lalu catat persetujuannya di sini.</p></div>
      <div className={s.actions}><button type="button" className={s.secondary} disabled={!!busy || loading} onClick={() => { setRevision(value => value + 1); setLoading(true); }}><RefreshCw size={16}/> Muat ulang</button>
        {canManage && <button type="button" className={s.primary} disabled={!!busy} aria-expanded={creating} aria-controls="funding-create" onClick={() => setCreating(value => !value)}><Plus size={17}/>{creating ? "Lihat grup pengajuan" : "Pilih penerima"}</button>}</div>
    </header>
    <div className={s.guide}><Wallet size={22}/><div><strong>1. Pilih penerima → 2. Ajukan di web sebelah → 3. Catat persetujuan</strong><p>Tandai bantuan yang dipilih sebagai sedang diajukan. Setelah dana disetujui di web sebelah, catat hasilnya pada grup yang sama agar Bendahara dapat mencairkan ke penyalur.</p></div></div>
    <nav className={s.stageTabs} aria-label="Tahap pengajuan dana">
      {canManage&&<button type="button" aria-pressed={creating} disabled={!!busy} onClick={()=>setCreating(true)}>Siap diajukan</button>}
      {Object.entries(labels).map(([value,label])=><button type="button" key={value} aria-pressed={!creating&&status===value} disabled={!!busy} onClick={()=>{setCreating(false);setStatus(value);setPage(1);setSearch("");setLoading(true);}}>{label}</button>)}
    </nav>
    {error && <div className={s.error} role="alert">{error} <button type="button" onClick={() => setError("")}>Tutup pesan</button></div>}
    {success && <div className={s.notice} role="status"><CheckCircle2 size={18}/>{success}</div>}
    {creating && canManage && <section id="funding-create" className={s.panel} aria-labelledby="funding-create-title">
      <div className={s.sectionHeading}><div><span className={s.eyebrow}>PILIH PENERIMA</span><h2 id="funding-create-title">Pilih bantuan untuk diajukan</h2><p>Maksimal 100 bantuan per kartu. Pilihan tetap tersimpan saat berpindah halaman atau filter.</p></div></div>
      <form onSubmit={create}><fieldset disabled={!!busy} className={s.fieldset}>
        <div className={s.formGrid}><label>Judul pengajuan<input value={title} onChange={event => setTitle(event.target.value)} maxLength={191} placeholder="Contoh: Dana bantuan November 2026" required/></label>
          <label>Catatan <span className={s.muted}>(opsional)</span><textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={5000} rows={2} placeholder="Keterangan untuk pengajuan dana ini"/></label></div>
        <div className={s.filters}><label>Cari bantuan<input type="search" maxLength={191} value={readySearch} placeholder="Nama atau nomor pengajuan" onChange={event => { setReadySearch(event.target.value); setReadyPage(1); setReadyLoading(true); }}/></label>
          <label>Program<select value={program} onChange={event => { setProgram(event.target.value); setReadyPage(1); setReadyLoading(true); }}><option value="">Semua program</option>{viewer.settings.programs.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Wilayah<select value={region} onChange={event => { setRegion(event.target.value); setReadyPage(1); setReadyLoading(true); }}><option value="">Semua wilayah</option>{viewer.settings.regions.map(value => <option key={value}>{value}</option>)}</select></label></div>
        <div className={s.listMeta}><span>{readyLoading ? "Memuat bantuan…" : `${ready.summary.count} bantuan siap · ${money(ready.summary.totalAmount)}`}</span><button type="button" className={s.textButton} disabled={readyLoading || !!readyError || !ready.data.length} onClick={() => setSelected(previous => {
          const next = { ...previous }, all = ready.data.every(row => !!next[row.id]);
          for (const row of ready.data) { if (all) delete next[row.id]; else if (Object.keys(next).length < 100) next[row.id] = row; }
          return next;
        })}>{ready.data.length > 0 && ready.data.every(row => !!selected[row.id]) ? "Lepas halaman ini" : "Pilih halaman ini"}</button></div>
        <div className={s.selectAllBar}>
          <div><strong>Pilih bantuan untuk diajukan dananya</strong><p>Semua halaman sesuai filter · maksimal 100 pengajuan per grup.</p><span aria-live="polite">{selection.length} pengajuan dipilih</span></div>
          <div className={s.selectAllActions}><button type="button" className={s.selectAllButton} disabled={!!busy||readyLoading||!!readyError||!ready.summary.count} onClick={()=>void selectAll()}><CheckCircle2 size={19}/>{busy==="select-all"?"Memilih pengajuan…":`Pilih semua (${Math.min(ready.summary.count,100)})`}</button>{selection.length>0&&<button type="button" className={s.clearSelection} disabled={!!busy} onClick={()=>setSelected({})}>Hapus pilihan</button>}</div>
        </div>
        {readyError && <p className={s.error} role="alert">{readyError}</p>}
        <div className={s.tableScroll} tabIndex={0} aria-label="Bantuan siap diajukan" aria-busy={readyLoading}><table><thead><tr><th scope="col">Pilih</th><th scope="col">Penerima & pengajuan</th><th scope="col">Program / wilayah</th><th scope="col">Nominal</th></tr></thead><tbody>
          {!readyLoading && !readyError && !ready.data.length && <tr><td colSpan={4} className={s.empty}>Tidak ada bantuan siap diajukan yang sesuai filter.</td></tr>}
          {ready.data.map(row => <tr key={row.id} className={selected[row.id] ? s.selected : undefined}><td><input type="checkbox" checked={!!selected[row.id]} disabled={readyLoading || !!readyError || !selected[row.id] && selection.length >= 100} aria-label={`Pilih ${row.name}, ${row.number}`} onChange={() => toggle(row)}/></td><td><strong>{row.name}</strong><small>{row.number}</small></td><td>{row.program}<small>{row.region}</small></td><td className={s.amount}>{money(row.amount)}</td></tr>)}
        </tbody></table></div>
        <Pagination page={readyPage} last={ready.last_page} disabled={readyLoading || !!busy} onChange={value => { setReadyPage(value); setReadyLoading(true); }}/>
        {selection.length > 0 && <details className={s.selection}><summary>Lihat {selection.length} bantuan terpilih, termasuk di luar filter</summary><div className={s.selectionList}>{selection.map(row => <div key={row.id}><span>{row.name} <small>{row.number}</small></span><strong>{money(row.amount)}</strong><button type="button" className={s.textButton} onClick={() => toggle(row)} aria-label={`Lepas ${row.name}`}>Lepas</button></div>)}</div></details>}
        {selection.length>0&&<DescriptionCopy title={title} items={selection} notes={notes}/>}
        <div className={s.createFooter}><div><span>{selection.length} / 100 bantuan terpilih</span><strong>{money(total)}</strong></div><div className={s.actions}><button type="button" className={s.secondary} disabled={!selection.length} onClick={() => setSelected({})}>Kosongkan pilihan</button><button className={s.primary} disabled={!selection.length || !!busy || readyLoading || !!readyError}>{busy === "create" ? "Mengajukan…" : "Tandai sedang diajukan"}</button></div></div>
      </fieldset></form>
    </section>}
    {!creating&&<section aria-labelledby="funding-list-title"><div className={s.sectionHeading}><div><h2 id="funding-list-title">{status?labels[status as keyof typeof labels]:"Grup pengajuan dana"}</h2><p>Buka grup yang sama untuk menyalin rincian atau mencatat keputusan dari web pengajuan dana.</p></div></div>
      <div className={s.filters}><label>Cari grup<input type="search" value={search} maxLength={191} placeholder="Judul atau nomor grup" onChange={event => { setSearch(event.target.value); setPage(1); setLoading(true); }}/></label><label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); setLoading(true); }}><option value="">Semua status</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>

      <div className={s.cards} aria-busy={loading}>{loading ? <p className={s.empty} role="status">Memuat kartu dana…</p> : cards.data.length === 0 ? <p className={s.empty}>Belum ada grup pengajuan pada tahap ini.{canManage ? " Pilih penerima di tab Siap diajukan terlebih dahulu." : ""}</p> : cards.data.map(row => <FundingCard key={`${row.id}:${row.version}:${revision}`} row={row} canManage={canManage} busy={!!busy} saving={busy === row.id} onDecide={decide}/>)}</div>
      <Pagination page={page} last={cards.last_page} disabled={loading || !!busy} onChange={value => { setPage(value); setLoading(true); }}/>
    </section>}
  </main>;
}

function Pagination({ page, last, disabled, onChange }: { page: number; last: number; disabled: boolean; onChange: (page: number) => void }) {
  if(last<=1)return null;
  return <nav className={s.pagination} aria-label="Halaman daftar"><button type="button" className={s.secondary} disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={15}/>Sebelumnya</button><span>Halaman {page} / {last}</span><button type="button" className={s.secondary} disabled={disabled || page >= last} onClick={() => onChange(page + 1)}>Berikutnya<ChevronRight size={15}/></button></nav>;
}

function FundingCard({ row, canManage, busy, saving, onDecide }: { row: FundingBatch; canManage: boolean; busy: boolean; saving: boolean; onDecide: (row: FundingBatch, decision: "approved" | "rejected", reason: string) => Promise<void> }) {
  const [open, setOpen] = useState(false), [decision, setDecision] = useState<"approved" | "rejected">("approved"), [reason, setReason] = useState("");
  const changed = row.items.some(item => item.status !== "fund_submitted" || item.currentAmount !== item.amount);
  return <article className={s.card}>
    <div className={s.cardTop}><span className={`${s.badge} ${s[row.status]}`}>{labels[row.status]}</span><span className={s.muted}>{day(row.createdAt)}</span></div>
    <h3>{row.title}</h3><small className={s.number}>{row.number}</small>
    <div className={s.cardTotal}><div><span>Total pengajuan</span><strong>{money(row.totalAmount)}</strong></div><span>{row.items.length} bantuan</span></div>
    <div className={s.distributors}><span>Penyalur bantuan</span><strong>{[...new Set(row.items.map(item=>item.distributorName||"Belum ditetapkan"))].join(" · ")}</strong></div>
    {row.notes && <p className={s.notes}>{row.notes}</p>}
    {row.decidedAt && <p className={s.muted}>Keputusan dicatat {day(row.decidedAt)}</p>}
    {row.reason && <div className={s.reason}><strong>Catatan keputusan</strong><p>{row.reason}</p></div>}
    <DescriptionCopy title={row.title} items={row.items} notes={row.notes??""} saved/>
    <button type="button" className={s.detailButton} aria-expanded={open} aria-controls={`funding-${row.id}`} onClick={() => setOpen(value => !value)}>{open ? "Tutup rincian" : "Lihat penerima"}<ChevronDown size={17}/></button>
    {open && <div id={`funding-${row.id}`} className={s.cardDetails}>
      <div className={s.tableScroll} tabIndex={0} aria-label={`Isi kartu ${row.title}`}><table><thead><tr><th>Penerima</th><th>Nominal saat diajukan</th><th>Penyalur</th><th>Tahap saat ini</th></tr></thead><tbody>{row.items.map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.number}</small><small>{item.program} · {item.region}</small></td><td className={s.amount}>{money(item.amount)}</td><td>{item.distributorName||"Belum ditetapkan"}</td><td>{bantuanStatuses[item.status] ?? item.status}</td></tr>)}</tbody></table></div>
    </div>}
      {canManage && row.status === "submitted" && (changed ? <p className={s.error}>Isi kartu sudah berubah tahap atau nominal. Periksa pengajuan terkait sebelum mencatat keputusan.</p> : <form className={s.decisionForm} onSubmit={event => { event.preventDefault(); void onDecide(row, decision, reason); }}><fieldset disabled={busy} className={s.fieldset}>
        <header className={s.decisionHeader}><span className={s.decisionIcon}><CheckCircle2 size={22}/></span><div><span className={s.decisionEyebrow}>KONFIRMASI DANA</span><h4>Catat hasil pengajuan</h4><p>Isi setelah keputusan diterima di web pengajuan dana.</p></div></header>
        <div className={s.decisionSummary}><div><span>Total dana</span><strong>{money(row.totalAmount)}</strong></div><div><span>Penerima bantuan</span><strong>{row.items.length}<small> orang</small></strong></div></div>
        <fieldset className={s.decisionChoices}><legend>Hasil keputusan</legend>
          <label className={decision==="approved"?s.choiceApproved:s.choice}><input type="radio" name={`decision-${row.id}`} value="approved" checked={decision==="approved"} onChange={()=>setDecision("approved")}/><span><strong>Disetujui</strong><small>Lanjut ke pencairan</small></span></label>
          <label className={decision==="rejected"?s.choiceRejected:s.choice}><input type="radio" name={`decision-${row.id}`} value="rejected" checked={decision==="rejected"} onChange={()=>setDecision("rejected")}/><span><strong>Ditolak</strong><small>Tinjau ulang nominal</small></span></label>
        </fieldset>
        <label className={s.decisionNote}><span>{decision==="rejected"?"Alasan penolakan":"Catatan keputusan"} <small>{decision==="rejected"?"Wajib":"Opsional"}</small></span><textarea value={reason} minLength={5} maxLength={5000} required={decision==="rejected"} onChange={event=>setReason(event.target.value)} rows={3} placeholder={decision==="rejected"?"Jelaskan alasan dana ditolak agar dapat ditinjau kembali…":"Tambahkan referensi atau keterangan persetujuan…"}/></label>
        <div className={s.decisionNext} aria-live="polite"><span>Setelah dikonfirmasi</span><p>{decision==="approved"?"Seluruh penerima dalam grup menjadi siap dicairkan. Bendahara melanjutkan transfer ke penyalur.":"Seluruh bantuan dikembalikan ke penyetuju untuk meninjau ulang nominal."}</p></div>
        <footer className={s.decisionFooter}><span>Keputusan berlaku untuk {row.items.length} penerima.</span><button className={decision==="approved"?s.primary:s.danger} disabled={busy}>{saving?"Menyimpan…":decision==="approved"?"Konfirmasi dana disetujui":"Konfirmasi penolakan"}<ChevronRight size={16}/></button></footer>
      </fieldset></form>)}
  </article>;
}

function DescriptionCopy({title,items,notes,saved=false}:{title:string;items:FundingCandidate[];notes:string;saved?:boolean}){
  const text=fundingDescription(title,items,notes);
  const [copied,setCopied]=useState(""),[error,setError]=useState("");
  async function copy(){
    setError("");
    try{await navigator.clipboard.writeText(text);setCopied(text);}
    catch{setError("Tidak dapat menyalin otomatis. Pilih teks rincian di bawah, lalu salin manual.");}
  }
  return <section className={s.description}>
    <div className={s.descriptionHeader}><div><h4>Deskripsi untuk pengajuan dana</h4><p>{saved?"Nominal mengikuti kartu; masalah dan kebutuhan mengikuti data terkini.":"Rincian otomatis mengikuti bantuan yang Anda centang."} Siap ditempel ke web pengajuan dana.</p></div>
    <button type="button" className={s.secondary} onClick={()=>void copy()}><Copy size={16}/>{copied===text?"Tersalin":"Salin rincian"}</button></div>
    <textarea aria-label="Rincian pengajuan dana siap salin" readOnly value={text} rows={8} onFocus={event=>event.currentTarget.select()}/>
    <span role="status">{copied===text?"Rincian berhasil disalin.":""}</span>
    {error&&<p role="alert" className={s.error}>{error}</p>}
  </section>;
}
