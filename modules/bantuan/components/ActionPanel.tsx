"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import type { AidDetail, BantuanStaff, BantuanViewer } from "@/contracts/modules/bantuan";
import { documentLabels } from "@/contracts/modules/bantuan";
import { request } from "../api/client";
import { preparePhoto } from "../api/photos";
import { applicantFields, Fields, type Values } from "./IntakeForm";
import { PhotoReview } from "./PhotoReview";
import { ProcessSuccess } from "./ProcessSuccess";
import { ApprovalAmount } from "./ApprovalAmount";
import { HandoverFields } from "./HandoverFields";
import { PhotoSlots, surveyPhotos, handoverPhotos } from "./PhotoSlots";
import s from "./Workspace.module.css";
import ux from "./Usability.module.css";
import { nextStep } from "../policy";

type Action = { key: string; label: string; states: string[]; roles: string[]; danger?: boolean };
const actions: Action[] = [
  {key:"submit",label:"Ajukan sekarang",states:["draft","needs_data"],roles:["call_center","verifier"]},
  {key:"screen_pass",label:"Lolos screening",states:["screening"],roles:["call_center"]},
  {key:"screen_reject",label:"Tolak screening",states:["screening"],roles:["call_center"],danger:true},
  {key:"request_data",label:"Minta lengkapi data",states:["screening","review1"],roles:["call_center","approver","chair"]},
  {key:"review1_approve",label:"Setujui untuk survei",states:["review1"],roles:["approver","chair"]},
  {key:"review1_reject",label:"Tolak pengajuan",states:["review1"],roles:["approver","chair"],danger:true},
  {key:"assign_survey",label:"Tugaskan Verifikator",states:["survey_assignment","survey_assigned"],roles:["call_center"]},
  {key:"survey_submit",label:"Isi / lanjutkan survei",states:["survey_assigned"],roles:["verifier"]},
  {key:"approve",label:"Setujui & tetapkan nominal",states:["survey_submitted","review2","bypass_review"],roles:["approver","chair"]},
  {key:"review_reject",label:"Tolak pengajuan",states:["survey_submitted","review2","bypass_review"],roles:["approver","chair"],danger:true},
  {key:"survey_again",label:"Minta survei ulang",states:["survey_submitted","review2"],roles:["approver","chair"]},
  {key:"assign_distributor",label:"Tentukan / ganti penyalur",states:["approved","fund_ready","fund_submitted","fund_approved","disbursed"],roles:["call_center"]},
  {key:"fund_submit",label:"Tandai dana diajukan",states:["fund_ready"],roles:["fund_requester"]},
  {key:"fund_approve",label:"Tandai dana disetujui",states:["fund_submitted"],roles:["fund_requester"]},
  {key:"fund_reject",label:"Tandai dana ditolak",states:["fund_submitted"],roles:["fund_requester"],danger:true},
  {key:"disburse",label:"Catat pencairan dana",states:["fund_approved"],roles:["treasurer"]},
  {key:"handover",label:"Laporkan penyerahan",states:["disbursed"],roles:["verifier","treasurer"]},
  {key:"delivery_fail",label:"Gagal disalurkan",states:["disbursed"],roles:["verifier","treasurer"],danger:true},
  {key:"return_funds",label:"Catat pengembalian dana",states:["delivery_failed"],roles:["treasurer"]},
  {key:"reopen",label:"Buka kembali pengajuan",states:["rejected_screening","rejected_t1","rejected_t2","rejected_bypass","cancelled","returned"],roles:["approver","chair"]},
  {key:"cancel",label:"Batalkan pengajuan",states:["draft","needs_data","screening","review1","survey_assignment","survey_assigned","survey_submitted","bypass_review","approved","fund_ready"],roles:["call_center"],danger:true},
];
const reasons=["screen_reject","request_data","review1_reject","review_reject","survey_again","fund_reject","delivery_fail","cancel","reopen","comment"];
const today=()=>new Date().toLocaleDateString("en-CA");
const surveyFields=[
  {key:"date",label:"Tanggal verifikasi",type:"date"},
  {key:"hasSktm",label:"Sudah memiliki SKTM?",type:"boolean"},
  {key:"sktmExplanation",label:"Penjelasan jika belum memiliki SKTM",type:"textarea",optional:true},
  {key:"background",label:"Latar belakang",type:"textarea"},
  {key:"currentCondition",label:"Kondisi saat ini",type:"textarea"},
  {key:"needs",label:"Kebutuhan bantuan",type:"textarea"},
  {key:"efforts",label:"Usaha dan upaya yang sudah dilakukan",type:"textarea"},
  {key:"homeObservation",label:"Pengamatan rumah & perabotan",type:"textarea"},
  {key:"stayDuration",label:"Lama tinggal",type:"number"}, {key:"stayUnit",label:"Satuan",options:["bulan","tahun"]},
  {key:"socialRecord",label:"Track record dan kondisi sosial",type:"textarea"},
  {key:"recommendation",label:"Rekomendasi Verifikator",options:["layak","tidak_layak"]},
  {key:"suggestions",label:"Kritik dan saran",type:"textarea",optional:true},
  {key:"notes",label:"Catatan tambahan",type:"textarea",optional:true},
];

export function DocumentUpload({ row, viewer, reload }: { row: AidDetail; viewer: BantuanViewer; reload: () => void }) {
  const [kind,setKind]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const role=viewer.role;
  const kinds=Object.keys(documentLabels).filter(k=>{
    if(k.startsWith("survey_")||k==="sktm"||k==="transfer"||["handover","certificate","receipt"].includes(k))return false;
    if(["completed","returned","cancelled"].includes(row.status))return false;
    if(role==="admin")return true;
    if(["face","ktp","kk","supporting"].includes(k))return ["call_center","verifier"].includes(role)&&["draft","needs_data","screening"].includes(row.status);
    if(["transfer","return"].includes(k))return role==="treasurer"&&["fund_approved","disbursed","delivery_failed"].includes(row.status);
    return row.status==="disbursed"&&(role==="verifier"&&row.distributorId===viewer.id||role==="treasurer"&&row.distributionType==="direct");
  });
  async function upload(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");setBusy(true);const form=new FormData(e.currentTarget);const files=form.getAll("files").filter((f):f is File=>f instanceof File&&f.size>0);try{if(!files.length)throw new Error("Pilih foto terlebih dahulu.");for(const file of files){const prepared=await preparePhoto(file);const body=new FormData();body.set("kind",kind||kinds[0]);body.set("file",prepared);await request(`applications/${row.id}/documents`,{method:"POST",body});}reload();}catch(err){setError(err instanceof Error?err.message:"Unggah gagal.");}finally{setBusy(false);}}
  return <section className={s.card}><div className={s.cardHeader}><div><h2>Dokumen & bukti</h2><p>Privat · JPG, PNG, WEBP · maks. 2 MB</p></div><span className={s.pill}>{row.documents.length} foto</span></div><div className={s.cardBody}>
    {row.documents.length===0?<p className={s.tiny}>Belum ada dokumen. Unggah bukti sesuai tahap saat ini.</p>:<PhotoReview owner={viewer.id} applicationId={row.id} documents={row.documents} allDocuments/>}
    {kinds.length>0&&<form onSubmit={upload} style={{display:"grid",gap:12,marginTop:20}}>
      <label className={s.field}>Jenis dokumen<select className={s.input} value={kind||kinds[0]} onChange={e=>setKind(e.target.value)}>{kinds.map(k=><option key={k} value={k}>{documentLabels[k]}</option>)}</select></label>
      <label className={s.upload}>Pilih foto<input name="files" type="file" accept="image/jpeg,image/png,image/webp" multiple required/></label>
      {error&&<p role="alert" className={s.tiny} style={{color:"#ad4b35"}}>{error}</p>}<button className={`${s.button} ${s.secondary}`} disabled={busy}>{busy?"Mengunggah…":"Unggah dokumen"}</button>
    </form>}
  </div></section>;
}

export function getAvailableActions(row:AidDetail,viewer:BantuanViewer){
  return actions.filter(a=>a.states.includes(row.status)&&(viewer.role==="admin"||a.roles.includes(viewer.role)))
    .filter(a=>viewer.role==="admin"||!(a.key==="survey_submit"&&row.verifierId!==viewer.id))
    .filter(a=>viewer.role==="admin"||!(["handover","delivery_fail"].includes(a.key)&&!(viewer.role==="verifier"&&row.distributionType==="verifier"&&row.distributorId===viewer.id||viewer.role==="treasurer"&&row.distributionType==="direct")))
    .filter(a=>viewer.role==="admin"||!(["review1_approve","review1_reject","approve","review_reject","survey_again"].includes(a.key)&&(row.verifierId===viewer.id||row.createdBy===viewer.id)));
}

export function ActionPanel({ row, viewer, staff, reload }: { row: AidDetail; viewer: BantuanViewer; staff: BantuanStaff[]; reload:()=>void }) {
  const actionLock=useRef(false);
  const [commentError,setCommentError]=useState("");
  const [success,setSuccess]=useState(""),[savedNotice,setSavedNotice]=useState("");
  const [surveyPhotosReady,setSurveyPhotosReady]=useState(false),[missingSurveyPhotos,setMissingSurveyPhotos]=useState<string[]>([]);
  const [handoverPhotosReady,setHandoverPhotosReady]=useState(false),[missingHandoverPhotos,setMissingHandoverPhotos]=useState<string[]>([]);
  const onHandoverPhotosReady=useCallback((ready:boolean,missing:string[])=>{setHandoverPhotosReady(ready);setMissingHandoverPhotos(missing);},[]);
  const [transferPhotosReady,setTransferPhotosReady]=useState(true);
  const onTransferPhotosReady=useCallback((ready:boolean)=>setTransferPhotosReady(ready),[]);
  const onSurveyPhotosReady=useCallback((ready:boolean,missing:string[])=>{setSurveyPhotosReady(ready);setMissingSurveyPhotos(missing);},[]);
  const [active,setActive]=useState<string|null>(()=>viewer.role==="verifier"&&row.verifierId===viewer.id&&row.status==="survey_assigned"?"survey_submit":null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [survey,setSurvey]=useState<Values>(()=>{
    const values:Record<string,string|number|boolean|null>={date:today(),stayUnit:"tahun"};
    for(const [key,value] of Object.entries(row.survey??{})) if(value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean")values[key]=value;
    return values;
  });
  const [corrections,setCorrections]=useState(row.applicant),[correct,setCorrect]=useState(false);
  const [contacts,setContacts]=useState<{name:string;relationship:string;phone:string}[]>((row.survey?.contacts as {name:string;relationship:string;phone:string}[])??[]);
  const [geo,setGeo]=useState<{latitude:number;longitude:number}|null>(null);
  const [distributionType,setDistributionType]=useState(row.distributionType??"verifier");
  const allowed=getAvailableActions(row,viewer);
  async function perform(e:FormEvent<HTMLFormElement>, key=active){e.preventDefault();if(!key||actionLock.current)return;if(key==="handover"&&!handoverPhotosReady){setError("Lengkapi foto penyaluran terlebih dahulu: "+(missingHandoverPhotos.join(", ")||"memeriksa unggahan…"));return;}if(key==="disburse"&&!transferPhotosReady){setError("Tunggu bukti transfer selesai diunggah atau hapus unggahan yang gagal. Bukti transfer bersifat opsional.");return;}if(key==="survey_submit"&&!surveyPhotosReady){setError("Lengkapi foto hasil survei terlebih dahulu: "+missingSurveyPhotos.join(", "));return;}actionLock.current=true;setBusy(true);setError("");if(key==="comment")setCommentError("");const submittedForm=e.currentTarget;const form=new FormData(submittedForm);const values:Record<string,unknown>=Object.fromEntries(form);for(const name of ["amount","transferAmount"])if(values[name])values[name]=Number(values[name]);if(key==="survey_submit"||key==="survey_save"){values.survey={...survey,contacts,...geo};if(correct)values.applicant=corrections;}if(key==="handover")values.handover={method:form.get("method"),date:form.get("date"),amount:Number(form.get("handoverAmount")),notes:form.get("notes")};
    try{await request(`applications/${row.id}/actions/${key}`,{method:"POST",body:JSON.stringify({...values,version:row.version})});
      if(key==="comment"){
        setSavedNotice("Catatan internal berhasil disimpan.");
        submittedForm.reset();
        reload();
      }else setSuccess(key==="survey_save"?"Draft survei tersimpan":actions.find(action=>action.key===key)?.label??"Proses selesai");
    }catch(err){(key==="comment"?setCommentError:setError)(err instanceof Error?err.message:"Tindakan gagal.");}finally{actionLock.current=false;setBusy(false);}}
  const primary=allowed.find(action=>!action.danger&&!["request_data","survey_again","reopen"].includes(action.key))??allowed.find(action=>!action.danger);
  const alternative=allowed.filter(action=>action.key!==primary?.key);
  if(success)return <ProcessSuccess title="Berhasil disimpan" description={`${success}. Perubahan pengajuan ${row.number} sudah tersimpan.`}/>;
  return <section className={s.card}><div className={s.cardHeader}><div><h2>{viewer.role==="verifier"&&row.verifierId===viewer.id&&row.status==="survey_assigned"?"Hasil survei":"Tindakan pengajuan"}</h2><p>Keputusan dicatat beserta petugas dan waktunya.</p></div></div><div className={s.cardBody}>
    {savedNotice&&<p className={`${s.notice} ${s.success}`} role="status">{savedNotice}</p>}
    <div className={ux.actionChoices} aria-label="Pilihan tindakan">
      {primary?<div className={ux.mainAction}><div><h3>{primary.label}</h3><p>{nextStep(row.status,row.source).description}</p></div><button type="button" className={s.button} aria-expanded={active===primary.key} aria-controls="aid-action-form" disabled={busy} onClick={()=>{setError("");setSavedNotice("");setActive(primary.key);}}>{primary.label} →</button></div>:<div className={ux.waiting}><h3>Belum ada tindakan untuk Anda pada tahap ini</h3><p>{nextStep(row.status,row.source).description} Penanggung jawab: {nextStep(row.status,row.source).owner}.</p></div>}
      {alternative.length>0&&<section className={ux.alternate} aria-label="Tindakan lainnya"><h3>Tindakan lainnya</h3><p>Pilih sesuai hasil pemeriksaan. Perubahan baru disimpan setelah dikonfirmasi.</p><div>{alternative.map(action=><button type="button" key={action.key} aria-pressed={active===action.key} data-tone={action.danger?"danger":"normal"} disabled={busy} className={`${s.button} ${action.danger?s.danger:s.secondary}`} onClick={()=>{setError("");setSavedNotice("");setActive(action.key);}}>{action.label}</button>)}</div></section>}
    </div>
    {active&&<form id="aid-action-form" onSubmit={perform} className={active==="survey_submit"?s.surveyForm:undefined}><fieldset className={s.actionFields} disabled={busy}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:22}}><h3 className={s.sectionTitle}>{actions.find(a=>a.key===active)?.label??"Komentar internal"}</h3><button type="button" className={`${s.button} ${s.secondary}`} onClick={()=>setActive(null)}>Batal mengisi</button></div>
      {active==="survey_submit"?<><Fields fields={surveyFields} values={survey} set={(k,v)=>setSurvey(p=>({...p,[k]:v}))}/>
        <h3 className={s.sectionTitle} style={{margin:"22px 0 14px"}}>Kerabat / tetangga yang dapat dihubungi</h3>{contacts.map((c,i)=><div className={s.formGrid} key={i} style={{marginBottom:14}}>{(["name","relationship","phone"] as const).map((k,j)=><label key={k} className={s.field}>{["Nama","Hubungan","No. HP"][j]}<input className={s.input} required value={c[k]} onChange={e=>setContacts(v=>v.map((r,n)=>n===i?{...r,[k]:e.target.value}:r))}/></label>)}<button type="button" className={s.link} onClick={()=>setContacts(v=>v.filter((_,n)=>n!==i))}>Hapus kontak</button></div>)}
        <div className={s.actions}><button type="button" className={`${s.button} ${s.secondary}`} onClick={()=>setContacts(v=>[...v,{name:"",relationship:"",phone:""}])}>+ Tambah kontak</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={()=>navigator.geolocation?.getCurrentPosition(p=>setGeo({latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>setError("Lokasi tidak diizinkan. Survei tetap dapat disimpan."))}>{geo?"✓ Lokasi tercatat":"Catat lokasi (opsional)"}</button></div>
        <label className={s.field} style={{margin:"25px 0 15px",flexDirection:"row"}}><input className={s.check} type="checkbox" checked={correct} onChange={e=>setCorrect(e.target.checked)}/> Koreksi data pemohon sesuai hasil kunjungan</label>{correct&&<Fields fields={applicantFields} values={corrections} set={(k,v)=>setCorrections(p=>({...p,[k]:v}))}/>}
        <section className={s.surveyEvidence} aria-label="Foto hasil survei"><h3 className={s.sectionTitle}>Foto penerima & kondisi rumah</h3><p>Ambil foto langsung atau pilih dari galeri. Beri keterangan untuk setiap foto; hasilnya otomatis tampil juga di Dokumen pendukung.</p>
          <PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={surveyPhotos} minimumTotal={viewer.settings.minimumSurveyPhotos} onReady={onSurveyPhotosReady} onUploaded={reload}/>
          {!surveyPhotosReady&&<small className={s.tiny}>Sebelum konfirmasi: {missingSurveyPhotos.join(", ")||"memeriksa kelengkapan foto…"}. Draft tetap bisa disimpan.</small>}
        </section>
      </>:<div className={s.formGrid}>
        {reasons.includes(active)&&<label className={`${s.field} ${s.wide}`}>Alasan / catatan *<textarea className={s.input} name="reason" required minLength={5} maxLength={5000}/></label>}
        {active==="approve"&&<ApprovalAmount row={row}/>}
        {["assign_survey","assign_distributor"].includes(active)&&<>
          {active==="assign_distributor"&&<label className={s.field}>Jenis penyalur<select className={s.input} name="distributionType" value={distributionType} onChange={e=>setDistributionType(e.target.value)}><option value="verifier">Verifikator</option>{row.source==="bypass"&&<option value="direct">Bendahara langsung ke penerima</option>}</select></label>}
          {(active==="assign_survey"||distributionType==="verifier")&&<label className={s.field}>Verifikator *<select className={s.input} name={active==="assign_survey"?"verifierId":"distributorId"} required defaultValue={active==="assign_survey"?row.verifierId??"":row.distributorId??""}><option value="">Pilih petugas</option>{staff.filter(p=>(p.roles??[p.role]).includes("verifier")&&p.active).map(p=><option key={p.id} value={p.id}>{p.name}{p.region?` · ${p.region}`:""}</option>)}</select></label>}
          {row.status==="disbursed"&&<label className={`${s.field} ${s.wide}`}>Alasan penggantian *<textarea className={s.input} name="reason" required minLength={5}/><small>Unggah bukti pengembalian dari penyalur lama. Setelah diganti, pencairan ulang wajib dicatat Bendahara.</small></label>}
        </>}
        {active==="fund_submit"&&<label className={s.field}>Referensi web dana (opsional)<input className={s.input} name="reference" maxLength={191}/></label>}
        {active==="fund_approve"&&<div className={`${s.notice} ${s.wide}`}>Pastikan persetujuan sudah diberikan di web pengajuan dana. Penanda ini akan menerbitkan rincian pencairan.</div>}
        {active==="disburse"&&<><label className={s.field}>Tanggal transfer *<input className={s.input} name="transferDate" type="date" defaultValue={today()} required max={today()}/></label><label className={s.field}>Nominal transfer (Rp) *<input className={s.input} name="transferAmount" type="number" min={1} defaultValue={row.amount??undefined} required/></label><label className={`${s.field} ${s.wide}`}>Rekening tujuan *<input className={s.input} name="account" required maxLength={191}/></label><div className={s.wide}><PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={[{kind:"transfer",minimum:0,hint:"Opsional. Pencairan tetap dapat dicatat tanpa bukti transfer."}]} onReady={onTransferPhotosReady} onUploaded={reload}/></div></>}
        {active==="handover"&&<><HandoverFields row={row} today={today()}/><section className={`${s.surveyEvidence} ${s.wide}`} aria-label="Foto penyaluran"><h3 className={s.sectionTitle}>Foto & bukti penyaluran</h3><p>Foto penyerahan dan sertifikat wajib dilengkapi. Kuitansi opsional. Semua foto tersimpan juga di Dokumen pendukung.</p><PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={handoverPhotos} onReady={onHandoverPhotosReady} onUploaded={reload}/></section></>}
      </div>}
      {error&&<div className={`${s.notice} ${s.error}`} style={{marginTop:18}} role="alert">{error}</div>}
      <div className={s.actions} style={{marginTop:22}}><button className={s.button} disabled={busy}>{busy?"Menyimpan…":"Konfirmasi & simpan"}</button>{active==="survey_submit"&&<button type="button" className={`${s.button} ${s.secondary}`} disabled={busy} onClick={e=>{const form=e.currentTarget.closest("form")!;void perform({preventDefault:()=>{},currentTarget:form} as FormEvent<HTMLFormElement>,"survey_save");}}>Simpan draft survei</button>}</div>
    </fieldset></form>}
    <form className={ux.commentForm} onSubmit={event=>void perform(event,"comment")} aria-label="Catatan internal">
      <label className={s.field}>Catatan internal<textarea className={s.input} name="reason" required minLength={5} maxLength={5000} placeholder="Tulis informasi untuk petugas berikutnya…" disabled={busy}/></label>
      <p>Hanya untuk tim. Menambahkan catatan tidak mengubah status pengajuan.</p>
      {commentError&&<p role="alert" className={s.fieldError}>{commentError}</p>}
      <div><button type="submit" className={`${s.button} ${s.secondary}`} disabled={busy}>{busy?"Menyimpan…":"Simpan catatan"}</button></div>
    </form>
  </div></section>;
}
