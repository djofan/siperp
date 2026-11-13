"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AidDetail, BantuanStaff, BantuanViewer } from "@/contracts/modules/bantuan";
import { bantuanStatuses } from "@/contracts/modules/bantuan";
import { hasAnyRole, rolesOf } from "../permissions";
import { manualStages, manualReasonActions } from "../manual-process";
import { request, RequestError } from "../api/client";
import { Fields, applicantFields, type Values } from "./IntakeForm";
import { surveyFields } from "../survey-fields";
import { MessageImport } from "./MessageImport";
import { PhotoSlots, surveyPhotosFor, handoverPhotosFor } from "./PhotoSlots";
import { VerifierPicker } from "./VerifierPicker";
import { CertificateBuilder } from "./CertificateBuilder";
import { ClipboardPen, Check, ChevronRight, LoaderCircle } from "lucide-react";
import s from "./ManualProcessPanel.module.css";
import w from "./Workspace.module.css";

type ManualFundingGroup={id:string;number:string;version:number;totalAmount:number;items:{id:string;name:string;version:number}[]};

export function ManualProcessPanel({row,viewer,staff,reload,onOpenChange}:{row:AidDetail;viewer:BantuanViewer;staff:BantuanStaff[];reload:()=>void;onOpenChange?:(open:boolean)=>void}){
 const options=(manualStages[row.status]??[]).filter(option=>row.intakeType!=="other"||option.action!=="survey_again");
 const [open,setOpen]=useState(false),[selected,setSelected]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [survey,setSurvey]=useState<Record<string,unknown>>(row.survey??{}),[applicant,setApplicant]=useState<Values>(row.applicant),[correct,setCorrect]=useState(false);
 const [fieldErrors,setFieldErrors]=useState<Record<string,string[]>>({});
 const [group,setGroup]=useState<ManualFundingGroup|null>(null);
 const panel=useRef<HTMLElement>(null);
 const action=options.find(option=>option.action===selected)??options[0];
 const groupId=row.fundingRequest?.id;
 const groupAction=action?.action==="fund_approve"||action?.action==="fund_reject";
 useEffect(()=>{
  if(!open||!groupId||!groupAction)return;
  const controller=new AbortController();
  void request<ManualFundingGroup>(`funding-requests/${groupId}`,{signal:controller.signal}).then(setGroup).catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"Kartu dana belum dapat dimuat.");});
  return()=>controller.abort();
 },[open,groupId,groupAction]);
 if(!hasAnyRole(viewer,["admin","call_center"])||!action)return null;
 const isSurvey=["survey_submit","survey_review_submit"].includes(action.action);
 const isAssignment=action.action==="assign_survey",isHandover=action.action==="handover";
 const assigned=isSurvey?row.manualProcess?.verifier:isHandover?row.manualProcess?.distributor:null;
 const assignedId=isSurvey?row.verifierId:isHandover?row.distributorId:null;
 const members=staff.filter(person=>person.active&&rolesOf(person).some(role=>action.roles.includes(role)));
 const date=new Date().toLocaleDateString("en-CA");
 async function save(event:FormEvent<HTMLFormElement>,draft=false){
  event.preventDefault();if(busy)return;
  const form=event.currentTarget;
  if(!draft&&!form.reportValidity())return;
  const data=new FormData(form),key=draft?(action.action==="survey_review_submit"?"survey_review_save":"survey_save"):action.action;
  const actorId=String(data.get("actorId")??"");
  const payload:Record<string,unknown>={action:key,version:row.version,manual:{actorId:actorId||null,name:String(data.get("actorName")??""),phone:data.get("actorPhone")||null,channel:data.get("channel"),date:data.get("date"),note:data.get("note")}};
  for(const name of ["surveyAddress","reference","account","reason","bank","recipientName","recipientRelationship"])if(data.has(name))payload[name]=data.get(name);
  if(isSurvey){payload.survey={...survey};if(correct)payload.applicant=applicant;}
  if(action.action==="approve")payload.amount=Number(data.get("amount"));
  if(action.action==="disburse"){payload.transferDate=data.get("date");payload.transferAmount=row.amount;}
  if(isHandover)payload.handover={method:data.get("method"),date:data.get("date"),amount:Number(data.get("amount")),notes:data.get("handoverNotes")};
  setBusy(true);setError("");setFieldErrors({});
  try{
   if(groupId&&groupAction){
    if(!group)throw new Error("Tunggu rincian kartu dana selesai dimuat.");
    await request(`funding-requests/${groupId}/manual-decision`,{method:"POST",body:JSON.stringify({version:group.version,decision:action.action==="fund_approve"?"approved":"rejected",reason:payload.reason,manual:payload.manual,items:group.items.map(item=>({id:item.id,version:item.version}))})});
   }else await request(`applications/${row.id}/manual-processes`,{method:"POST",body:JSON.stringify(payload)});setNotice(draft?"Draft pencatatan tersimpan.":"Proses manual berhasil dicatat. Status pengajuan telah diperbarui.");setOpen(false);onOpenChange?.(false);reload();}
  catch(cause){setError(cause instanceof Error?cause.message:"Pencatatan belum berhasil.");if(cause instanceof RequestError)setFieldErrors(cause.fields);requestAnimationFrame(()=>panel.current?.scrollIntoView({behavior:"smooth",block:"start"}));}
  finally{setBusy(false);}
 }
 return <section ref={panel} className={s.panel} aria-label="Pencatatan proses manual">
  <header className={s.header}><span className={s.icon}><ClipboardPen size={21}/></span><div><h3>Proses dilakukan di luar web?</h3><p>Catat hasil dari WhatsApp, Telegram, atau laporan petugas. Nama pelaksana tetap tercatat sesuai kegiatan sebenarnya.</p></div><button type="button" className={`${w.button} ${w.secondary}`} aria-expanded={open} onClick={()=>{setOpen(!open);onOpenChange?.(!open);setNotice("");requestAnimationFrame(()=>panel.current?.scrollIntoView({behavior:"smooth",block:"start"}));}}>{open?"Tutup pencatatan":"Catat proses manual"}<ChevronRight size={16}/></button></header>
  {notice&&<p role="status" className={s.success}>{notice}</p>}
  {open&&<form onSubmit={event=>void save(event)} className={s.form}>
   <div className={s.context}><strong>{row.name}</strong><span>{row.number} · {bantuanStatuses[row.status]}</span></div>
   <label className={w.field}>Proses yang akan dicatat<select className={w.input} value={action.action} onChange={event=>{setSelected(event.target.value);setError("");setFieldErrors({});}}>{options.map(option=><option key={option.action} value={option.action}>{option.label}</option>)}</select></label>
   {error&&<div role="alert" className={s.error}><strong>Pencatatan belum tersimpan</strong><p>{error}</p>{Object.keys(fieldErrors).length>0&&<ul>{Object.entries(fieldErrors).map(([key,values])=><li key={key}>{key.replace(/^manual\./,"")}: {values.join(" ")}</li>)}</ul>}</div>}
   <fieldset disabled={busy} className={s.fields} key={action.action}>
    <section className={s.section}><h4>Pelaksana sebenarnya</h4><p>Pengisi web: <strong>{viewer.name}</strong>. Pencatatan ini tidak mengganti nama petugas lapangan.</p>
     <div className={s.grid}><VerifierPicker key={action.action} staff={members} name="actorId" initialId={assignedId??(action.roles.includes("call_center")&&members.some(person=>person.id===viewer.id)?viewer.id:"")} required={false} label="Pelaksana" roleFilter={null}/><label className={w.field}>Nama pelaksana jika belum memiliki akun<input className={w.input} name="actorName" maxLength={191} defaultValue={assigned?.name??(action.roles.includes("call_center")?viewer.name:"")} placeholder="Contoh: Suparta"/><small>Pilih akun di sebelah atau isi nama petugas. Untuk hasil survei dan penyerahan, gunakan pelaksana sesuai penugasan.</small></label><label className={w.field}>Nomor HP pelaksana (opsional)<input className={w.input} name="actorPhone" type="tel" maxLength={30} defaultValue={assigned?.phone??""}/></label><label className={w.field}>Tanggal pelaksanaan *<input className={w.input} name="date" type="date" required max={date} defaultValue={isSurvey?String(row.survey?.date??date):date}/></label></div>
    </section>
    <section className={s.section}><h4>Dasar pencatatan</h4><div className={s.grid}><label className={w.field}>Sumber informasi *<select className={w.input} name="channel" required><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="other">Laporan lainnya</option></select></label><label className={w.field}>Keterangan / referensi *<textarea className={w.input} name="note" required minLength={5} maxLength={5000} placeholder="Contoh: Hasil kunjungan dikirim Suparta melalui grup Telegram."/></label></div></section>
    {groupId&&groupAction&&<section className={s.section}><h4>Keputusan untuk seluruh kartu dana</h4>{group?<><p>{group.number} · {group.items.length} penerima · Rp {group.totalAmount.toLocaleString("id-ID")}</p><ul>{group.items.map(item=><li key={item.id}>{item.name}</li>)}</ul><label className={s.toggle}><input type="checkbox" required/>Saya memastikan keputusan ini berlaku untuk seluruh penerima dalam kartu.</label></>:<p role="status">Memuat isi kartu dana…</p>}</section>}
    {isAssignment&&<label className={w.field}>Alamat survei *<textarea className={w.input} name="surveyAddress" required minLength={10} maxLength={1000} defaultValue={row.surveyLocation?.address??String(row.applicant.street??"")}/></label>}
    {manualReasonActions.includes(action.action)&&<label className={w.field}>Alasan / catatan keputusan *<textarea className={w.input} name="reason" required minLength={5} maxLength={5000}/></label>}
    {isSurvey&&<section className={s.section}><h4>Hasil survei dari petugas</h4><MessageImport applicant={applicant} survey={survey as Values} labels={Object.fromEntries([...applicantFields,...surveyFields].map(field=>[field.key,field.label]))} onApply={data=>{setSurvey(value=>({...value,...data.survey}));if(Object.keys(data.applicant).length){setApplicant(value=>({...value,...data.applicant}));setCorrect(true);}}}/><Fields fields={surveyFields} values={survey as Values} set={(key,value)=>setSurvey(current=>({...current,[key]:value}))} errors={Object.fromEntries(Object.entries(fieldErrors).filter(([key])=>key.startsWith("survey.")).map(([key,value])=>[key.slice(7),value]))}/><label className={s.toggle}><input type="checkbox" checked={correct} onChange={event=>setCorrect(event.target.checked)}/>Perbarui data pemohon sesuai laporan petugas</label>{correct&&<Fields fields={applicantFields} values={applicant} set={(key,value)=>setApplicant(current=>({...current,[key]:value}))}/>}<PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={surveyPhotosFor(row.source)} onUploaded={reload}/></section>}
    {action.action==="approve"&&<label className={w.field}>Nominal yang telah disetujui (Rp) *<input className={w.input} name="amount" type="number" min={1} required defaultValue={row.amount??undefined}/></label>}
    {action.action==="fund_submit"&&<label className={w.field}>Referensi pengajuan dana (opsional)<input className={w.input} name="reference" maxLength={191}/></label>}
    {action.action==="disburse"&&<section className={s.section}><h4>Transfer ke {row.manualDistributorName??staff.find(person=>person.id===row.distributorId)?.name??"penyalur"}</h4><p>Nominal sesuai keputusan: Rp {Number(row.amount??0).toLocaleString("id-ID")}. Tanggal transfer menggunakan tanggal pelaksanaan di atas.</p><label className={w.field}>Rekening tujuan *<input className={w.input} name="account" maxLength={191} required/></label>{row.intakeType==="other"&&<div className={w.grid}>{[["bank","Bank tujuan"],["recipientName","Nama penyalur penerima transfer"],["recipientRelationship","Hubungan penerima"]].map(([name,label])=><label key={name} className={w.field}>{label} *<input className={w.input} name={name} required maxLength={191} defaultValue={name==="recipientName"?row.manualDistributorName??staff.find(person=>person.id===row.distributorId)?.name:name==="recipientRelationship"?"Penyalur bantuan":undefined}/></label>)}</div>}<PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={[{kind:"transfer",minimum:row.intakeType==="other"?1:0}]} onUploaded={reload}/></section>}
    {isHandover&&<section className={s.section}><h4>Rincian penyerahan</h4><div className={s.grid}><label className={w.field}>Metode penyerahan<select className={w.input} name="method"><option value="tunai">Tunai</option><option value="transfer">Transfer</option></select></label><label className={w.field}>Nominal diterima pemohon (Rp) *<input className={w.input} name="amount" type="number" min={1} required defaultValue={row.amount??undefined}/></label></div><label className={w.field}>Catatan penyerahan (opsional)<textarea className={w.input} name="handoverNotes" maxLength={5000}/></label><CertificateBuilder row={row} verifier={row.manualVerifierName??staff.find(person=>person.id===row.verifierId)?.name??""}/><PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={handoverPhotosFor(row.program)} onUploaded={reload}/></section>}
    {action.action==="return_funds"&&<PhotoSlots owner={viewer.id} applicationId={row.id} documents={row.documents} requirements={[{kind:"return",minimum:1}]} onUploaded={reload}/>}
   </fieldset>
   <footer className={s.footer}><small>Konfirmasi hanya proses yang benar-benar sudah dilakukan. Data dan foto wajib tetap diperiksa.</small><div>{isSurvey&&<button type="button" className={`${w.button} ${w.secondary}`} disabled={busy} onClick={event=>{const form=event.currentTarget.form;if(form)void save({preventDefault(){},currentTarget:form} as FormEvent<HTMLFormElement>,true);}}>Simpan draft</button>}<button type="submit" className={w.button} disabled={busy||Boolean(groupId&&groupAction&&!group)}>{busy?<LoaderCircle size={17} className={w.spin}/>:<Check size={17}/>} {busy?"Menyimpan…":"Konfirmasi & lanjutkan"}</button></div></footer>
  </form>}
 </section>;
}
