"use client";
import Link from "next/link";
import { rolesOf } from "../permissions";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { AidDetail, BantuanStaff, BantuanViewer } from "@/contracts/modules/bantuan";
import { documentLabels } from "@/contracts/modules/bantuan";
import { fieldMessage, request, RequestError } from "../api/client";
import { focusActionProblem, nativeActionErrors, revealActionTarget, type ActionErrors } from "../action-feedback";
import { preparePhoto } from "../api/photos";
import { applicantFields, Fields, validateFields, type Values } from "./IntakeForm";
import { PhotoReview } from "./PhotoReview";
import { ProcessSuccess } from "./ProcessSuccess";
import { ApprovalAmount } from "./ApprovalAmount";
import { MessageImport } from "./MessageImport";
import { HandoverFields } from "./HandoverFields";
import { CertificateBuilder } from "./CertificateBuilder";
import { surveyFields } from "../survey-fields";
import { PhotoSlots, surveyPhotosFor, handoverPhotosFor } from "./PhotoSlots";
import s from "./Workspace.module.css";
import ux from "./Usability.module.css";
import d from "./ActionForm.module.css";
import { AlertCircle, Check, ClipboardList, LoaderCircle, ShieldCheck } from "lucide-react";
import { nextStep } from "../policy";

type Action = { key: string; label: string; states: string[]; roles: string[]; danger?: boolean };
const actions: Action[] = [
  {key:"submit",label:"Ajukan sekarang",states:["draft","needs_data"],roles:["call_center","verifier","requester"]},
  {key:"screen_pass",label:"Teruskan ke Approver",states:["screening"],roles:["call_center"]},
  {key:"screen_reject",label:"Tolak pengajuan",states:["screening"],roles:["call_center"],danger:true},
  {key:"request_data",label:"Minta lengkapi data",states:["screening","review1"],roles:["call_center","approver","chair"]},
  {key:"review1_approve",label:"Setujui untuk survei",states:["review1"],roles:["approver","chair"]},
  {key:"review1_reject",label:"Tolak pengajuan",states:["review1"],roles:["approver","chair"],danger:true},
  {key:"assign_survey",label:"Tugaskan / ganti Verifikator",states:["survey_assignment","survey_assigned"],roles:["call_center"]},
  {key:"survey_decline",label:"Tolak tugas survei",states:["survey_assigned"],roles:["verifier"],danger:true},
  {key:"survey_review_submit",label:"Review & kirim hasil ke Approver",states:["survey_cc_review"],roles:["call_center"]},
  {key:"survey_return",label:"Kembalikan ke Verifikator",states:["survey_cc_review"],roles:["call_center"]},
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
  {key:"cancel",label:"Batalkan pengajuan",states:["draft","needs_data","screening","review1","survey_assignment","survey_assigned","survey_submitted","bypass_review","approved","fund_ready"],roles:["call_center","requester"],danger:true},
];
const reasons=["survey_decline","survey_return","screen_reject","request_data","review1_reject","review_reject","survey_again","fund_reject","delivery_fail","cancel","reopen","comment"];
const today=()=>new Date().toLocaleDateString("en-CA");


export function DocumentUpload({ row, viewer, reload }: { row: AidDetail; viewer: BantuanViewer; reload: () => void }) {
  const [kind,setKind]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const kinds=Object.keys(documentLabels).filter(k=>rolesOf(viewer).some(role=>{
    if(k.startsWith("survey_")||k==="sktm"||k==="transfer"||["handover","certificate","receipt","education_other"].includes(k))return false;
    if(["completed","returned","cancelled"].includes(row.status))return false;
    if(role==="admin")return true;
    if(["face","ktp","kk","supporting"].includes(k))return (role==="call_center"||role==="verifier"&&row.createdBy===viewer.id)&&["draft","needs_data","screening"].includes(row.status)||role==="requester"&&row.createdBy===viewer.id&&["draft","needs_data"].includes(row.status);
    if(["transfer","return"].includes(k))return role==="treasurer"&&["fund_approved","disbursed","delivery_failed"].includes(row.status);
    return row.status==="disbursed"&&(role==="verifier"&&row.distributorId===viewer.id||role==="treasurer"&&row.distributionType==="direct");
  }));
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

function actionsForRole(row:AidDetail,viewer:BantuanViewer){
  return actions.filter(a=>a.states.includes(row.status)&&(viewer.role==="admin"||a.roles.includes(viewer.role)))
    .filter(a=>!row.fundingRequest||!["fund_approve","fund_reject","assign_distributor"].includes(a.key))
    .filter(a=>viewer.role!=="verifier"||!["submit","cancel"].includes(a.key)||row.createdBy===viewer.id&&row.source==="bypass"&&["draft","needs_data"].includes(row.status))
    .filter(a=>a.key!=="request_data"||viewer.role==="admin"||(row.status==="screening"?viewer.role==="call_center":["approver","chair"].includes(viewer.role)))
    .filter(a=>viewer.role!=="requester"||row.createdBy===viewer.id&&row.source!=="bypass"&&["draft","needs_data",...(a.key==="cancel"?["screening"]:[])].includes(row.status))
    .filter(a=>viewer.role==="admin"||!(row.intakeRole==="requester"&&row.createdBy===viewer.id&&["screen_pass","screen_reject"].includes(a.key)))
    .filter(a=>viewer.role==="admin"||!(["survey_submit","survey_decline"].includes(a.key)&&row.verifierId!==viewer.id))
    .filter(a=>viewer.role==="admin"||!(["survey_review_submit","survey_return"].includes(a.key)&&row.verifierId===viewer.id))
    .filter(a=>viewer.role==="admin"||!(["handover","delivery_fail"].includes(a.key)&&!(viewer.role==="verifier"&&row.distributionType==="verifier"&&row.distributorId===viewer.id||viewer.role==="treasurer"&&row.distributionType==="direct")))
    .filter(a=>viewer.role==="admin"||!(["review1_approve","review1_reject","approve","review_reject","survey_again"].includes(a.key)&&(row.verifierId===viewer.id||row.createdBy===viewer.id)));
}

export function getAvailableActions(row:AidDetail,viewer:BantuanViewer){
  return [...new Map(rolesOf(viewer).flatMap(role=>actionsForRole(row,{...viewer,role})).map(action=>[action.key,action])).values()];
}


export function getPrimaryAction(row:AidDetail,viewer:BantuanViewer){
  const available=getAvailableActions(row,viewer);
  if(row.status==="survey_assigned"&&row.verifierId===viewer.id){
    const survey=available.find(action=>action.key==="survey_submit");
    if(survey)return survey;
  }
  return available.find(action=>!action.danger&&!["request_data","survey_again","reopen"].includes(action.key))??available.find(action=>!action.danger);
}

export function getActionSectionLabel(row:AidDetail,viewer:BantuanViewer){
  const primary=getPrimaryAction(row,viewer);
  if(!primary)return row.survey?"Lihat hasil survei":"Status pengajuan";
  const labels:Record<string,string>={
    submit:"Kirim pengajuan",screen_pass:"Periksa pengajuan",review1_approve:"Persetujuan survei",
    assign_survey:"Tugaskan verifikator",survey_submit:"Isi survei",survey_review_submit:"Periksa hasil survei",
    approve:"Persetujuan bantuan",assign_distributor:"Tentukan penyalur",fund_submit:"Ajukan dana",
    fund_approve:"Konfirmasi dana",disburse:"Catat pencairan",handover:"Laporan penyerahan",
    return_funds:"Pengembalian dana",reopen:"Buka kembali pengajuan",request_data:"Lengkapi data",
    survey_again:"Survei ulang",survey_return:"Periksa hasil survei",
  };
  return labels[primary.key]??primary.label;
}

const actionHelp:Record<string,string>={
  submit:"Periksa kelengkapan data. Pengajuan akan dikirim ke petugas pada tahap berikutnya.",
  screen_pass:"Teruskan pengajuan yang sudah diperiksa kepada Approver untuk mendapat keputusan.",
  screen_reject:"Tulis alasan penolakan agar pembuat pengajuan memahami hasil pemeriksaan.",
  request_data:"Tulis data yang perlu diperbaiki. Pembuat pengajuan akan menerima permintaan kelengkapan.",
  review1_approve:"Setujui pengajuan ini untuk survei? Setelah disimpan, Call Center dapat menugaskan Verifikator.",
  review1_reject:"Tulis alasan penolakan. Keputusan dan alasannya akan tercatat pada riwayat pengajuan.",
  assign_survey:"Pilih petugas yang akan mengunjungi pemohon dan mengisi hasil survei.",
  survey_submit:"Lengkapi hasil kunjungan dan foto wajib. Hasilnya dikirim ke Call Center untuk diperiksa sebelum diteruskan ke Approver.",
  survey_decline:"Tulis alasan tidak dapat menjalankan survei. Call Center akan menerima pemberitahuan dan menugaskan petugas lain.",
  survey_review_submit:"Periksa dan koreksi hasil survei serta data pemohon. Kirim setelah lengkap agar Approver dapat meninjau keputusan nominal.",
  survey_return:"Jelaskan bagian survei yang perlu dilengkapi. Hasilnya dikembalikan kepada Verifikator yang ditugaskan.",
  approve:"Tetapkan nominal bantuan berdasarkan hasil survei dan kebutuhan pemohon.",
  review_reject:"Jelaskan alasan pengajuan tidak dilanjutkan. Periksa kembali sebelum mengonfirmasi.",
  survey_again:"Jelaskan bagian yang perlu disurvei ulang agar Verifikator mengetahui perbaikannya.",
  assign_distributor:"Pilih siapa yang akan menyerahkan bantuan. Penugasan baru disimpan setelah dikonfirmasi.",
  fund_submit:"Catat referensi jika tersedia. Tindakan ini menandai bahwa dana sudah diajukan di web dana.",
  fund_approve:"Pastikan dana sudah disetujui di web dana. Setelah dikonfirmasi, Bendahara dapat mencatat pencairan.",
  fund_reject:"Tulis alasan penolakan dana agar nominal atau pengajuan dapat ditinjau kembali.",
  disburse:"Catat transfer yang sudah dilakukan. Lengkapi tanggal, nominal, dan rekening tujuan.",
  handover:"Isi rincian penyerahan serta foto bukti. Setelah disimpan, pengajuan ditandai selesai.",
  delivery_fail:"Jelaskan kendala penyerahan agar pengembalian dana dapat ditindaklanjuti.",
  return_funds:"Unggah bukti pengembalian dana sebelum mengonfirmasi pencatatannya.",
  reopen:"Tulis alasan membuka kembali pengajuan. Pengajuan akan kembali ke tahap peninjauan yang sesuai.",
  cancel:"Yakin ingin membatalkan pengajuan ini? Tulis alasannya agar tercatat dan dapat dipahami petugas.",
};
const confirmLabels:Record<string,string>={
  submit:"Kirim pengajuan",screen_pass:"Teruskan ke Approver",screen_reject:"Ya, tolak pengajuan",
  request_data:"Kirim permintaan perbaikan",review1_approve:"Ya, setujui untuk survei",review1_reject:"Ya, tolak pengajuan",
  survey_decline:"Tolak tugas & beri tahu Call Center",survey_review_submit:"Kirim ke Approver",survey_return:"Kembalikan untuk diperbaiki",
  assign_survey:"Simpan penugasan",survey_submit:"Kirim hasil survei",approve:"Tetapkan nominal bantuan",
  review_reject:"Ya, tolak pengajuan",survey_again:"Minta survei ulang",assign_distributor:"Simpan penyalur",
  fund_submit:"Tandai dana diajukan",fund_approve:"Konfirmasi dana disetujui",fund_reject:"Tandai dana ditolak",
  disburse:"Simpan pencairan",handover:"Selesaikan penyerahan",delivery_fail:"Catat gagal salur",
  return_funds:"Simpan pengembalian",reopen:"Buka kembali pengajuan",cancel:"Ya, batalkan pengajuan",
};

export function ActionPanel({ row, viewer, staff, reload, initialAction }: { initialAction?:string|null; row: AidDetail; viewer: BantuanViewer; staff: BantuanStaff[]; reload:()=>void }) {
  const actionLock=useRef(false),actionRegion=useRef<HTMLElement>(null),lastTrigger=useRef<HTMLButtonElement|null>(null);
  const actionForm=useRef<HTMLFormElement>(null),errorSummary=useRef<HTMLDivElement>(null);
  const [fieldErrors,setFieldErrors]=useState<ActionErrors>({});
  const [returnPhotosReady,setReturnPhotosReady]=useState(false);
  const onReturnPhotosReady=useCallback((ready:boolean)=>setReturnPhotosReady(ready),[]);
  const [commentError,setCommentError]=useState("");
  const [success,setSuccess]=useState(""),[savedNotice,setSavedNotice]=useState("");
  const [surveyPhotosReady,setSurveyPhotosReady]=useState(false),[missingSurveyPhotos,setMissingSurveyPhotos]=useState<string[]>([]);
  const [handoverPhotosReady,setHandoverPhotosReady]=useState(false),[missingHandoverPhotos,setMissingHandoverPhotos]=useState<string[]>([]);
  const onHandoverPhotosReady=useCallback((ready:boolean,missing:string[])=>{setHandoverPhotosReady(ready);setMissingHandoverPhotos(missing);},[]);
  const [transferPhotosReady,setTransferPhotosReady]=useState(true);
  const onTransferPhotosReady=useCallback((ready:boolean)=>setTransferPhotosReady(ready),[]);
  const onSurveyPhotosReady=useCallback((ready:boolean,missing:string[])=>{setSurveyPhotosReady(ready);setMissingSurveyPhotos(missing);},[]);
  const [active,setActive]=useState<string|null>(()=>["certificate","handover"].includes(initialAction??"")&&getAvailableActions(row,viewer).some(action=>action.key==="handover")?"handover":getAvailableActions(row,viewer).some(action=>action.key==="survey_review_submit")?"survey_review_submit":null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [survey,setSurvey]=useState<Values>(()=>{
    const values:Record<string,string|number|boolean|null>={date:today(),stayUnit:"tahun"};
    for(const field of surveyFields){const value=row.applicant["assessment_"+field.key];if(value!==undefined&&(value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean"))values[field.key]=value;}
    for(const [key,value] of Object.entries(row.survey??{})) if(value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean")values[key]=value;
    return values;
  });
  const [corrections,setCorrections]=useState(row.applicant),[correct,setCorrect]=useState(false);
  const [contacts,setContacts]=useState<{name:string;relationship:string;phone:string}[]>((row.survey?.contacts as {name:string;relationship:string;phone:string}[])??[]);
  const [geo,setGeo]=useState<{latitude:number;longitude:number}|null>(null);
  const [distributionType,setDistributionType]=useState(row.distributionType??"verifier");
  const allowed=getAvailableActions(row,viewer);
  const surveyEntry=active==="survey_submit"||active==="survey_review_submit";
  useEffect(()=>{
    if(!active)return;
    const frame=requestAnimationFrame(()=>{const target=initialAction==="certificate"?document.getElementById("handover-certificate"):actionRegion.current;if(target)revealActionTarget(target);});
    return()=>cancelAnimationFrame(frame);
  },[active,initialAction]);
  function openAction(key:string,trigger:HTMLButtonElement){
    if(actionLock.current)return;
    lastTrigger.current=trigger;
    setError("");setFieldErrors({});setSavedNotice("");
    if(active===key&&actionRegion.current)revealActionTarget(actionRegion.current);
    else setActive(key);
  }
  function closeAction(){
    if(actionLock.current)return;
    setActive(null);setError("");setFieldErrors({});
    if(lastTrigger.current)revealActionTarget(lastTrigger.current,"nearest");
  }
  function reportFailure(message:string,fields:ActionErrors={},form=actionForm.current){
    setError(message);setFieldErrors(fields);
    requestAnimationFrame(()=>{
      if(form)focusActionProblem(form,fields,errorSummary.current);
      else if(errorSummary.current)revealActionTarget(errorSummary.current,"center");
    });
  }
  function fieldLabel(key:string){
    const name=key.replace(/^(survey[.-]|applicant\.|correction-)/,"");
    if(/^contacts\./.test(name))return "Kontak kerabat / tetangga";
    if(/^dependents\./.test(name))return "Data tanggungan";
    const field=(key.startsWith("survey")?surveyFields:applicantFields).find(field=>field.key===name);
    const labels:Record<string,string>={reason:"Alasan / catatan",amount:"Nominal bantuan",verifierId:"Verifikator",surveyAddress:"Alamat lokasi survei",distributorId:"Penyalur",distributionType:"Jenis penyalur",transferDate:"Tanggal transfer",transferAmount:"Nominal transfer",account:"Rekening tujuan","handover.amount":"Nominal diserahkan","handover.date":"Tanggal penyerahan","handover.method":"Metode penyerahan",reference:"Referensi web dana"};
    return field?.label??labels[key]??"Isian yang perlu diperbaiki";
  }
  async function perform(e:FormEvent<HTMLFormElement>, key=active){
    e.preventDefault();if(!key||actionLock.current)return;
    const submittedForm=e.currentTarget;
    if(key!=="comment"&&key!=="survey_save"&&key!=="survey_review_save"){
      const invalid=nativeActionErrors(submittedForm);
      if(key==="survey_submit"||key==="survey_review_submit"){
        for(const [name,messages] of Object.entries(validateFields(surveyFields,survey)))invalid["survey."+name]=messages;
        if(survey.hasSktm===false&&!String(survey.sktmExplanation??"").trim())invalid["survey.sktmExplanation"]=["Jelaskan alasan belum memiliki SKTM."];
        if(correct)for(const [name,messages] of Object.entries(validateFields(applicantFields,corrections)))invalid["applicant."+name]=messages;
      }
      if(Object.keys(invalid).length){reportFailure("Lengkapi atau perbaiki kolom yang ditandai sebelum menyimpan.",invalid,submittedForm);return;}
    }
    if(key==="handover"&&!handoverPhotosReady){reportFailure("Lengkapi foto penyerahan dan sertifikat di form ini: "+(missingHandoverPhotos.join(", ")||"memeriksa unggahan…"));return;}
    if(key==="disburse"&&!transferPhotosReady){reportFailure("Tunggu bukti transfer selesai diunggah atau hapus unggahan yang gagal. Bukti transfer bersifat opsional.");return;}
    if(key==="survey_submit"&&!surveyPhotosReady){reportFailure("Lengkapi foto hasil survei di form ini: "+missingSurveyPhotos.join(", "));return;}
    if((key==="return_funds"||key==="assign_distributor"&&row.status==="disbursed")&&!returnPhotosReady){reportFailure("Unggah bukti pengembalian dana pada bagian foto di form ini terlebih dahulu.");return;}
    actionLock.current=true;setBusy(true);setError("");setFieldErrors({});if(key==="comment")setCommentError("");
    const form=new FormData(submittedForm),values:Record<string,unknown>=Object.fromEntries(form);
    for(const name of ["amount","transferAmount"])if(values[name])values[name]=Number(values[name]);
    if(["survey_submit","survey_save","survey_review_submit","survey_review_save"].includes(key)){values.survey={...survey,contacts,...geo};if(correct)values.applicant=corrections;}
    if(key==="handover")values.handover={method:form.get("method"),date:form.get("date"),amount:Number(form.get("handoverAmount")),notes:form.get("notes")};
    try{
      await request(`applications/${row.id}/actions/${key}`,{method:"POST",body:JSON.stringify({...values,version:row.version})});
      if(key==="comment"){setSavedNotice("Catatan internal berhasil disimpan.");submittedForm.reset();reload();}
      else setSuccess(key==="survey_save"?"Draft survei tersimpan":key==="survey_review_save"?"Koreksi survei tersimpan":actions.find(action=>action.key===key)?.label??"Proses selesai");
    }catch(err){
      if(key==="comment")setCommentError(err instanceof Error?err.message:"Catatan belum tersimpan.");
      else reportFailure(err instanceof Error?err.message:"Tindakan belum berhasil disimpan.",err instanceof RequestError?err.fields:{},submittedForm);
    }finally{actionLock.current=false;setBusy(false);}
  }
  function saveSurveyDraft(){
    if(actionForm.current)void perform({preventDefault(){},currentTarget:actionForm.current} as FormEvent<HTMLFormElement>,active==="survey_review_submit"?"survey_review_save":"survey_save");
  }
  const primary=getPrimaryAction(row,viewer);
  const alternative=allowed.filter(action=>action.key!==primary?.key);
  const activeAction=allowed.find(action=>action.key===active);
  const actionFormId="aid-action-form-"+row.id,regionId=actionFormId+"-region";
  const surveyErrors=Object.fromEntries(Object.entries(fieldErrors).filter(([key])=>key.startsWith("survey.")).map(([key,value])=>[key.slice(7),value]));
  const correctionErrors=Object.fromEntries(Object.entries(fieldErrors).filter(([key])=>key.startsWith("applicant.")).map(([key,value])=>[key.slice(10),value]));
  if(success)return <ProcessSuccess title="Berhasil disimpan" description={`${success}. Perubahan pengajuan ${row.number} sudah tersimpan.`}/>;
  return <section className={s.card}><div className={s.cardHeader}><div><h2>{getActionSectionLabel(row,viewer)}</h2><p>Keputusan dicatat beserta petugas dan waktunya.</p></div></div><div className={s.cardBody}>
    {row.fundingRequest&&<div className={s.notice}><strong>Termasuk kartu dana {row.fundingRequest.number}</strong><p>Keputusan dana dicatat dari kartu agar seluruh bantuan dalam kartu tetap konsisten.</p>{rolesOf(viewer).some(role=>["admin","fund_requester","treasurer","chair"].includes(role))&&<Link className={s.link} href="/admin/bantuan/pengajuan-dana">Buka kartu pengajuan dana →</Link>}</div>}
    {row.status==="fund_ready"&&rolesOf(viewer).some(role=>["admin","fund_requester"].includes(role))&&<div className={s.notice}><strong>Ajukan bersama bantuan lainnya</strong><p>Buka Pengajuan dana, buat kartu, lalu centang bantuan yang ingin diajukan. Total nominal dihitung otomatis.</p><Link className={s.link} href="/admin/bantuan/pengajuan-dana">Buat kartu pengajuan dana →</Link></div>}
    {savedNotice&&<p className={`${s.notice} ${s.success}`} role="status">{savedNotice}</p>}
    <div className={ux.actionChoices} aria-label="Pilihan tindakan">
      {primary?<div className={ux.mainAction}><div><h3>{primary.label}</h3><p>{nextStep(row.status,row.source,row.intakeRole).description}</p></div><button type="button" className={s.button} aria-expanded={active===primary.key} aria-controls={regionId} disabled={busy} onClick={event=>openAction(primary.key,event.currentTarget)}>{primary.label} →</button></div>:<div className={ux.waiting}><h3>Belum ada tindakan untuk Anda pada tahap ini</h3><p>{nextStep(row.status,row.source,row.intakeRole).description} Penanggung jawab: {nextStep(row.status,row.source,row.intakeRole).owner}.</p></div>}
      {alternative.length>0&&<section className={ux.alternate} aria-label="Tindakan lainnya"><h3>Tindakan lainnya</h3><p>Pilih sesuai hasil pemeriksaan. Perubahan baru disimpan setelah dikonfirmasi.</p><div>{alternative.map(action=><button type="button" key={action.key} aria-controls={regionId} aria-expanded={active===action.key} data-tone={action.danger?"danger":"normal"} disabled={busy} className={s.button} onClick={event=>openAction(action.key,event.currentTarget)}>{action.label}</button>)}</div></section>}
    </div>
    {active&&activeAction&&<section key={active} id={regionId} ref={actionRegion} tabIndex={-1} className={d.panel} data-action={active} aria-labelledby={regionId+"-title"}>
      <header className={d.header}><div><span>Tindakan yang dipilih</span><h3 id={regionId+"-title"}>{activeAction.label}</h3></div><button type="button" className={`${s.button} ${s.secondary}`} disabled={busy} onClick={closeAction}>Batal mengisi</button></header>
      <div className={d.form}>
      <div className={d.context}><ClipboardList size={21}/><div><strong>{row.name}</strong><span>{row.number} · {row.program}</span></div></div>
      <div className={d.help} data-danger={Boolean(activeAction.danger)}>{activeAction.danger?<AlertCircle size={19}/>:<ShieldCheck size={19}/>}<p>{actionHelp[active]??"Lengkapi isian dan periksa kembali sebelum menyimpan."}</p></div>
      <form id={actionFormId} ref={actionForm} onSubmit={perform} noValidate data-validated={Boolean(error)} className={surveyEntry?s.surveyForm:undefined}>
      {error&&<div className={d.error} ref={errorSummary} role="alert" tabIndex={-1}><div className={d.errorTitle}><AlertCircle size={18}/>Tindakan belum dapat disimpan</div><p>{error}</p>{Object.keys(fieldErrors).length>0&&<ul>{Object.entries(fieldErrors).map(([key,messages])=><li key={key}><button type="button" onClick={()=>{if(actionForm.current)focusActionProblem(actionForm.current,{[key]:messages},errorSummary.current);}}>{fieldLabel(key)}: {fieldMessage(messages[0]??"Periksa isian ini.")}</button></li>)}</ul>}</div>}
      <fieldset className={s.actionFields} disabled={busy}>
      {surveyEntry?<><MessageImport applicant={corrections} survey={survey} labels={Object.fromEntries([...applicantFields,...surveyFields].map(f=>[f.key,f.label]))} onApply={data=>{setSurvey(v=>({...v,...data.survey}));if(Object.keys(data.applicant).length){setCorrections(v=>({...v,...data.applicant}));setCorrect(true);}}}/>{active==="survey_review_submit"&&<div className={s.notice}><strong>Periksa hasil survei dari Verifikator</strong><p>Isian di bawah berasal dari hasil kunjungan dan dapat Anda koreksi. Gunakan Simpan koreksi untuk menyimpan sementara, atau Kirim ke Approver setelah pemeriksaan selesai.</p></div>}<Fields fields={surveyFields} prefix="survey-" errors={surveyErrors} values={survey} set={(k,v)=>setSurvey(p=>({...p,[k]:v}))}/>
        <h3 className={s.sectionTitle} style={{margin:"22px 0 14px"}}>Kerabat / tetangga yang dapat dihubungi</h3>{contacts.map((c,i)=><div className={s.formGrid} key={i} style={{marginBottom:14}}>{(["name","relationship","phone"] as const).map((k,j)=><label key={k} className={s.field}>{["Nama","Hubungan","No. HP"][j]}<input className={s.input} name={`survey.contacts.${i}.${k}`} required value={c[k]} onChange={e=>setContacts(v=>v.map((r,n)=>n===i?{...r,[k]:e.target.value}:r))}/></label>)}<button type="button" className={s.link} onClick={()=>setContacts(v=>v.filter((_,n)=>n!==i))}>Hapus kontak</button></div>)}
        <div className={s.actions}><button type="button" className={`${s.button} ${s.secondary}`} onClick={()=>setContacts(v=>[...v,{name:"",relationship:"",phone:""}])}>+ Tambah kontak</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={()=>navigator.geolocation?.getCurrentPosition(p=>setGeo({latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>reportFailure("Lokasi tidak diizinkan. Survei tetap dapat disimpan."))}>{geo?"✓ Lokasi tercatat":"Catat lokasi (opsional)"}</button></div>
        <label className={s.field} style={{margin:"25px 0 15px",flexDirection:"row"}}><input className={s.check} type="checkbox" checked={correct} onChange={e=>setCorrect(e.target.checked)}/> Koreksi data pemohon sesuai hasil kunjungan</label>{correct&&<Fields fields={applicantFields} prefix="correction-" errors={correctionErrors} values={corrections} set={(k,v)=>setCorrections(p=>({...p,[k]:v}))}/>}
        {active==="survey_submit"?<section className={s.surveyEvidence} aria-label="Foto hasil survei"><h3 className={s.sectionTitle}>Dokumen & foto hasil survei</h3><p>Foto yang sudah dikirim tetap tersedia dan dihitung. Saat revisi, cukup tambahkan foto yang kurang sesuai catatan pemeriksa. Foto tambahan juga tampil di Dokumen pendukung.</p>
          <PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={surveyPhotosFor(row.source)} minimumTotal={viewer.settings.minimumSurveyPhotos} onReady={onSurveyPhotosReady} onUploaded={reload}/>
          {!surveyPhotosReady&&<small className={s.tiny}>Sebelum konfirmasi: {missingSurveyPhotos.join(", ")||"memeriksa kelengkapan foto…"}. Draft tetap bisa disimpan.</small>}
        </section>:<section className={s.surveyEvidence}><h3 className={s.sectionTitle}>Foto hasil survei Verifikator</h3><p>Periksa bukti kunjungan sebelum meneruskan hasilnya. Foto asli tetap tersimpan.</p><PhotoReview owner={viewer.id} applicationId={row.id} documents={row.documents} allDocuments/></section>}
      </>:<div className={s.formGrid}>
        {reasons.includes(active)&&<label className={`${s.field} ${s.wide}`}>Alasan / catatan *<textarea className={s.input} name="reason" required minLength={5} maxLength={5000}/></label>}
        {active==="approve"&&<ApprovalAmount row={row}/>}
        {["assign_survey","assign_distributor"].includes(active)&&<>
          {active==="assign_distributor"&&<label className={s.field}>Jenis penyalur<select className={s.input} name="distributionType" value={distributionType} onChange={e=>setDistributionType(e.target.value)}><option value="verifier">Verifikator</option>{row.source==="bypass"&&<option value="direct">Bendahara langsung ke penerima</option>}</select></label>}
          {(active==="assign_survey"||distributionType==="verifier")&&<label className={s.field}>Verifikator *<select className={s.input} name={active==="assign_survey"?"verifierId":"distributorId"} required defaultValue={active==="assign_survey"?row.verifierId??"":row.distributorId??""}><option value="">Pilih petugas</option>{staff.filter(p=>(p.roles??[p.role]).includes("verifier")&&p.active).map(p=><option key={p.id} value={p.id}>{p.name}{p.region?` · ${p.region}`:""}</option>)}</select></label>}
          {active==="assign_survey"&&<SurveyAssignmentAddress row={row}/>}
          {active==="assign_survey"&&row.verifierId&&<label className={`${s.field} ${s.wide}`}>Alasan mengganti Verifikator<textarea className={s.input} name="reason" minLength={5} maxLength={5000} placeholder="Jelaskan alasan perubahan tugas…"/><small>Riwayat penugasan sebelumnya tetap tersimpan.</small></label>}
          {row.status==="disbursed"&&<label className={`${s.field} ${s.wide}`}>Alasan penggantian *<textarea className={s.input} name="reason" required minLength={5}/><small>Unggah bukti pengembalian dari penyalur lama. Setelah diganti, pencairan ulang wajib dicatat Bendahara.</small></label>}
        </>}
        {active==="fund_submit"&&<label className={s.field}>Referensi web dana (opsional)<input className={s.input} name="reference" maxLength={191}/></label>}
        {active==="fund_approve"&&<div className={`${s.notice} ${s.wide}`}>Pastikan persetujuan sudah diberikan di web pengajuan dana. Penanda ini akan menerbitkan rincian pencairan.</div>}
        {active==="disburse"&&<><div className={`${s.notice} ${s.wide}`}><strong>Transfer kepada {staff.find(person=>person.id===row.distributorId)?.name??"penerima yang ditetapkan"}</strong><p>Dana disetujui: Rp {Number(row.amount??0).toLocaleString("id-ID")}. Periksa rekening tujuan, isi tanggal, lalu unggah bukti jika tersedia.</p></div><label className={s.field}>Tanggal transfer *<input className={s.input} name="transferDate" type="date" defaultValue={today()} required max={today()}/></label><label className={s.field}>Nominal transfer (Rp) *<input className={s.input} name="transferAmount" type="number" min={1} defaultValue={row.amount??undefined} readOnly required/></label><label className={`${s.field} ${s.wide}`}>Rekening tujuan *<input className={s.input} name="account" required maxLength={191}/></label><div className={s.wide}><PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={[{kind:"transfer",minimum:0,hint:"Opsional. Pencairan tetap dapat dicatat tanpa bukti transfer."}]} onReady={onTransferPhotosReady} onUploaded={reload}/></div></>}
        {active==="handover"&&<><HandoverFields row={row} today={today()}/><CertificateBuilder defaultOpen={initialAction==="certificate"} row={row} verifier={staff.find(person=>person.id===row.verifierId)?.name??(viewer.id===row.verifierId?viewer.name:"")}/><section className={`${s.surveyEvidence} ${s.wide}`} aria-label="Foto penyaluran"><h3 className={s.sectionTitle}>Foto & bukti penyaluran</h3><p>Foto penyerahan dan sertifikat wajib dilengkapi. Kuitansi opsional. Semua foto tersimpan juga di Dokumen pendukung.</p><PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={handoverPhotosFor(row.program)} onReady={onHandoverPhotosReady} onUploaded={reload}/></section></>}
      </div>}
      {(active==="return_funds"||active==="assign_distributor"&&row.status==="disbursed")&&<section className={s.surveyEvidence} aria-label="Bukti pengembalian dana"><h3 className={s.sectionTitle}>Bukti pengembalian dana</h3><p>Unggah bukti dari penyalur sebelumnya di sini.</p><PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={[{kind:"return",minimum:1,hint:"Wajib sebelum mencatat pengembalian atau mengganti penyalur setelah pencairan."}]} onReady={onReturnPhotosReady} onUploaded={reload}/></section>}
    </fieldset>
      <div className={d.footer}><p>Periksa kembali isian. Perubahan disimpan setelah dikonfirmasi.</p><div className={d.buttons}>
        {surveyEntry&&<button type="button" className={`${s.button} ${s.secondary}`} disabled={busy} onClick={saveSurveyDraft}>{active==="survey_review_submit"?"Simpan koreksi":"Simpan draft survei"}</button>}
        <button type="submit" className={d.confirm} data-danger={Boolean(activeAction.danger)} disabled={busy}>{busy?<LoaderCircle className={s.spin} size={16}/>:activeAction.danger?<AlertCircle size={16}/>:<Check size={16}/>} {busy?"Menyimpan…":confirmLabels[active]??"Konfirmasi & simpan"}</button>
      </div></div>
    </form></div></section>}
    <form className={ux.commentForm} onSubmit={event=>void perform(event,"comment")} aria-label="Catatan internal">
      <label className={s.field}>Catatan internal<textarea className={s.input} name="reason" required minLength={5} maxLength={5000} placeholder="Tulis informasi untuk petugas berikutnya…" disabled={busy}/></label>
      <p>Hanya untuk tim. Menambahkan catatan tidak mengubah status pengajuan.</p>
      {commentError&&<p role="alert" className={s.fieldError}>{commentError}</p>}
      <div><button type="submit" className={`${s.button} ${s.secondary}`} disabled={busy}>{busy?"Menyimpan…":"Simpan catatan"}</button></div>
    </form>
  </div></section>;
}

function SurveyAssignmentAddress({row}:{row:AidDetail}) {
  const [address,setAddress]=useState(row.surveyLocation?.address??"");
  const applicantAddress=["street","rtRw","village","district","city"].map(key=>row.applicant[key]).filter(value=>typeof value==="string"&&value.trim()).join(", ");
  return <div className={`${s.field} ${d.assignmentAddress}`}>
    <label className={s.field}>Alamat lokasi survei *
      <textarea className={s.input} name="surveyAddress" value={address} onChange={event=>setAddress(event.target.value)} required minLength={10} maxLength={1000} rows={3} placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota, dan patokan lokasi"/>
      <small>Pastikan alamat kunjungan sudah dikonfirmasi. Alamat ini digunakan untuk tugas dan peta verifikator, tanpa mengubah alamat pada data pemohon.</small>
    </label>
    {applicantAddress&&<div className={s.actions}><button type="button" className={`${s.button} ${s.secondary}`} onClick={()=>setAddress(applicantAddress)}>Gunakan alamat data pemohon</button></div>}
  </div>;
}
