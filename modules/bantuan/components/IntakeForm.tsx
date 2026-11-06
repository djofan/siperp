"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { discardLocalPhotos, pausePhotos, photoSnapshot } from "../api/photo-queue";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, CloudCheck, LoaderCircle, Save } from "lucide-react";
import type { AidDetail, AidApplication, AidValues, AidApplicantHistory, BantuanViewer } from "@/contracts/modules/bantuan";
import { fieldMessage, request, RequestError } from "../api/client";
import { getDraft, putDraft, removeDraft } from "../api/vault";
import { href, homeByRole, intakeStage } from "../policy";
import { Button, Dialog, Toast } from "./ui";
import { ReturningApplicantPicker } from "./ReturningApplicantPicker";
import { ProcessSuccess } from "./ProcessSuccess";
import { PhotoSlots, intakePhotos } from "./PhotoSlots";
import { PhotoReview } from "./PhotoReview";
import { ApplicantHistory } from "./ApplicantHistory";
import { PageGuide } from "./PageGuide";
import { LoadingState } from "./LoadingState";
import s from "./Workspace.module.css";
import controls from "./IntakeActions.module.css";
import { canRestoreIntake, submitIntake } from "../intake-lifecycle";
import { hasAnyRole } from "../permissions";
import { surveyFields } from "../survey-fields";
import { AddressRegions } from "./AddressRegions";
import { MessageImport } from "./MessageImport";
import { DependentsEditor } from "./Dependents";
import { dependentErrors } from "../dependents";

export type Values = AidValues;
export type Field = { key: string; label: string; type?: string; options?: string[]; wide?: boolean; optional?: boolean; hint?: string };
export const applicantFields: Field[] = [
  {key:"name",label:"Nama lengkap"}, {key:"nik",label:"NIK",type:"nik",hint:"16 digit. Pengajuan sebelumnya akan ditandai, bukan diblokir."},
  {key:"birthPlace",label:"Tempat lahir"}, {key:"birthDate",label:"Tanggal lahir",type:"date"},
  {key:"gender",label:"Jenis kelamin",options:["laki_laki","perempuan"]}, {key:"maritalStatus",label:"Status pernikahan",options:["Menikah","Duda","Janda","Janda mati","Belum menikah"]},
  {key:"street",label:"Alamat lengkap saat ini",wide:true}, {key:"rtRw",label:"RT / RW",optional:true}, {key:"village",label:"Desa / kelurahan",optional:true},
  {key:"district",label:"Kecamatan",optional:true}, {key:"city",label:"Kabupaten / kota",optional:true},
  {key:"housing",label:"Status tempat tinggal",options:["Milik sendiri","Tinggalan orang tua","Kontrak-sewa","Menumpang","Lainnya"]},
  {key:"rent",label:"Biaya sewa (Rp)",type:"number",optional:true},
  {key:"rentPeriod",label:"Periode biaya sewa",options:["bulan","tahun"],optional:true},
  {key:"job",label:"Pekerjaan"}, {key:"phone",label:"Nomor HP",type:"tel"},
  {key:"income",label:"Penghasilan (Rp)",type:"number"}, {key:"incomePeriod",label:"Periode penghasilan",options:["hari","pekan","bulan"]},
  {key:"dependentCount",label:"Jumlah tanggungan",type:"number"}, {key:"dependents",label:"Rincian tanggungan",optional:true,hint:"Isi nama, hubungan, umur, dan status setiap tanggungan."},
  {key:"prayer",label:"Sholat 5 waktu",options:["Ya","Jarang","Tidak"]}, {key:"smoking",label:"Merokok",options:["Ya","Jarang","Tidak"]},
  {key:"previousAid",label:"Pernah menerima bantuan?",type:"boolean"}, {key:"previousAidNotes",label:"Keterangan bantuan sebelumnya",optional:true},
  {key:"publicationConsent",label:"Bersedia dipublikasi?",type:"boolean",hint:"Hanya mencatat persetujuan. Modul ini tidak mempublikasikan data."},
  {key:"hasSktm",label:"Sudah punya SKTM?",type:"boolean"},
  {key:"willingSktm",label:"Bersedia mengurus SKTM?",type:"boolean"},
  {key:"informationSource",label:"Mendapat informasi LAZSIP dari"},
  {key:"problem",label:"Masalah yang dihadapi",type:"textarea",wide:true},
];
export const customFields:Field[]=[
 {key:"customTitle",label:"Nama kegiatan / kebutuhan",optional:true},
 {key:"customBeneficiaries",label:"Sasaran penerima manfaat",optional:true,hint:"Contoh: keluarga pemohon, janda, anak yatim, atau warga satu RT."},
 {key:"customLocation",label:"Lokasi kegiatan / pekerjaan",optional:true},
 {key:"customBudget",label:"Rincian kebutuhan & perkiraan biaya",type:"textarea",optional:true,wide:true},
 {key:"customSchedule",label:"Rencana waktu & frekuensi",optional:true,hint:"Contoh: sekali pada November, atau rutin setiap bulan."},
 {key:"customOutcome",label:"Hasil yang diharapkan",type:"textarea",optional:true},
];
export const reporterFields: Field[] = [
  {key:"reporterName",label:"Nama pelapor",optional:true},
  {key:"reporterRelationship",label:"Hubungan dengan pemohon",optional:true,hint:"Contoh: istri, suami, tetangga, atau pendamping."},
  {key:"reporterOrganization",label:"Yayasan / lembaga / perorangan",optional:true},
  {key:"reporterPhone",label:"Nomor HP pelapor",type:"tel",optional:true},
  {key:"reporterAddress",label:"Alamat pelapor",type:"textarea",optional:true},
  {key:"reporterProgram",label:"Program yang disampaikan pelapor",optional:true},
];
export const bypassFields: Field[] = [
  {key:"bypassKnowledge",label:"Dasar mengenal kondisi pemohon",type:"textarea",hint:"Jelaskan hubungan dengan pemohon, kapan kondisi diperiksa, dan sumber informasinya."},
  {key:"bypassCondition",label:"Kondisi keluarga & kesehatan",type:"textarea",hint:"Jelaskan kondisi saat ini dan dampaknya terhadap keluarga."},
  {key:"bypassHome",label:"Kondisi tempat tinggal",type:"textarea",hint:"Jelaskan kelayakan rumah, fasilitas, dan lingkungan."},
  {key:"bypassExpenses",label:"Pengeluaran & beban keuangan",type:"textarea",hint:"Rinci kebutuhan rutin, biaya mendesak, utang, dan sumber bantuan lain."},
  {key:"bypassEfforts",label:"Upaya yang sudah dilakukan",type:"textarea",hint:"Apa yang sudah diusahakan pemohon dan hasilnya?"},
  {key:"bypassNeeds",label:"Rincian kebutuhan bantuan",type:"textarea",hint:"Rinci barang atau biaya yang dibutuhkan beserta perkiraan nominalnya."},
  {key:"bypassRecommendation",label:"Rekomendasi & urgensi bantuan",type:"textarea",hint:"Jelaskan bantuan yang disarankan, alasannya, serta kapan dibutuhkan."},
];
export function validateFields(fields:Field[],values:Values):Record<string,string[]>{
  const errors:Record<string,string[]>={};
  for(const f of fields){
    if(["rent","rentPeriod"].includes(f.key)&&values.housing!=="Kontrak-sewa")continue;
    if(f.key==="willingSktm"&&values.hasSktm!==false)continue;
    const value=values[f.key];
    if(!f.optional&&(value===undefined||value===null||value===""))errors[f.key]=["Kolom ini wajib diisi."];
    else if(f.type==="nik"&&!/^[0-9]{16}$/.test(String(value??"")))errors[f.key]=["NIK harus terdiri dari 16 digit angka."];
    else if(f.type==="date"&&value&&new Date(String(value))>new Date())errors[f.key]=["Tanggal tidak boleh melewati hari ini."];
    else if(f.type==="number"&&value!==""&&value!==undefined&&value!==null&&(!Number.isInteger(Number(value))||Number(value)<0))errors[f.key]=["Masukkan angka bulat, minimal 0."];
  }
  if(fields.some(f=>f.key==="dependents"))Object.assign(errors,dependentErrors(values.dependents));
  return errors;
}
export function Fields({fields,values,set,prefix="",required=true,errors={},original,onBlur}:{fields:Field[];values:Values;set:(key:string,value:Values[string])=>void;prefix?:string;required?:boolean;errors?:Record<string,string[]>;original?:Values;onBlur?:(key:string)=>void}){
  const [touched,setTouched]=useState<Record<string,boolean>>({});
  const [today]=useState(()=>new Date());
  const localErrors=required?validateFields(fields,values):{};
  const blur=(key:string)=>{setTouched(v=>({...v,[key]:true}));onBlur?.(key);};
  return <div className={s.formGrid}>{fields.filter(f=>(!["rent","rentPeriod"].includes(f.key)||values.housing==="Kontrak-sewa")&&(f.key!=="willingSktm"||values.hasSktm===false)).map(f=>{
    const id=prefix+f.key,error=errors[id]?.[0]??errors[f.key]?.[0]??(touched[f.key]?localErrors[f.key]?.[0]:undefined);
    const changed=original&&String(original[f.key]??"")!==String(values[f.key]??"");
    const segmented=f.type==="boolean"||["prayer","smoking"].includes(f.key);
    const options=f.type==="boolean"?["true","false"]:f.options??[];
    const rupiah=["income","rent"].includes(f.key);
    const birth=String(values.birthDate??""),date=new Date(birth);
    const age=birth?today.getFullYear()-date.getFullYear()-(today.getMonth()<date.getMonth()||today.getMonth()===date.getMonth()&&today.getDate()<date.getDate()?1:0):null;
    return <div className={`${s.field} ${f.wide||f.key==="dependents"?s.wide:""} ${changed?s.changedField:""}`} key={id}>
      <label htmlFor={segmented?id+"-0":id}>{f.label}{!f.optional&&required&&<em> *</em>}{changed&&<span className={s.changedLabel}>Diubah</span>}</label>
      {f.key==="dependents"?<DependentsEditor value={values.dependents} errors={errors} onChange={rows=>{set("dependents",rows);set("dependentCount",rows.length);}}/>:segmented?<div className={s.segmented} role="radiogroup" aria-label={f.label}>{options.map((o,i)=><button key={o} id={id+"-"+i} type="button" role="radio" aria-checked={String(values[f.key])===o} onClick={()=>{set(f.key,f.type==="boolean"?o==="true":o);if(f.key==="hasSktm")set("willingSktm","");blur(f.key);}}>{o==="true"?"Ya":o==="false"?f.key==="hasSktm"?"Belum":"Tidak":o}</button>)}</div>:
      f.options?<select id={id} className={s.input} name={id} value={String(values[f.key]??"")} aria-invalid={!!error} onBlur={()=>blur(f.key)} onChange={e=>set(f.key,e.target.value)}><option value="">Pilih…</option>{options.map(o=><option key={o} value={o}>{o.replaceAll("_"," ")}</option>)}</select>:
      f.type==="textarea"?<textarea id={id} className={s.input} name={id} value={String(values[f.key]??"")} aria-invalid={!!error} onBlur={()=>blur(f.key)} maxLength={10000} onChange={e=>set(f.key,e.target.value)}/>:
      <div className={rupiah?s.moneyInput:undefined}>{rupiah&&<span>Rp</span>}<input id={id} className={s.input} name={id} type={rupiah||f.type==="nik"?"text":f.type??"text"} inputMode={rupiah||f.type==="nik"||f.type==="number"?"numeric":undefined} maxLength={f.type==="nik"?16:1000} max={f.type==="date"?today.toLocaleDateString("en-CA"):undefined} min={f.type==="number"?0:undefined} value={rupiah&&values[f.key]!==undefined&&values[f.key]!==""?Number(values[f.key]).toLocaleString("id-ID"):String(values[f.key]??"")} aria-invalid={!!error} onBlur={()=>blur(f.key)} onChange={e=>set(f.key,rupiah?e.target.value.replace(/[^0-9]/g,"")?Number(e.target.value.replace(/[^0-9]/g,"")):"":f.type==="number"?e.target.value===""?"":Number(e.target.value):e.target.value)}/></div>}
      {error?<small role="alert" className={s.fieldError}>{fieldMessage(error)}</small>:f.key==="birthDate"&&age!==null&&age>=0?<small>Usia {age} tahun</small>:f.hint&&<small>{f.hint}</small>}
    </div>;
  })}</div>;
}

type IntakeState={applicant:Values;source:string;program:string;region:string;bypassReason:string;step:number;draftKey:string;formVersion?:number};
type LocalDraft={form:IntakeState;saved:AidApplication|null;updatedAt:string};
const labels=["Data pemohon","Kondisi & kebutuhan","Foto & dokumen","Periksa & kirim"];
export function IntakeForm({viewer,initial,direct=false}:{viewer:BantuanViewer;initial?:AidDetail;direct?:boolean}){
  const router=useRouter();
  const origin=useSearchParams().get("from");
  const originQuery=origin!==null&&/^[a-z0-9-]*$/.test(origin)?`?from=${encodeURIComponent(origin)}`:"";
  const restoreViewer=useRef(viewer);
  const editingProcessed=!!initial&&!(["draft","needs_data"].includes(initial.status))&&hasAnyRole(viewer,["admin","call_center"]);
  const formId=useId();
  const [form,setForm]=useState<IntakeState>(()=>({applicant:initial?.applicant??{incomePeriod:"bulan"},source:initial?.source??(direct||viewer.role==="verifier"?"bypass":"online"),program:initial?.program??viewer.settings.programs[0],region:initial?.region??"",bypassReason:initial?.bypassReason??"",step:0,formVersion:2,draftKey:initial?.id??crypto.randomUUID()}));
  const [reporterEnabled,setReporterEnabled]=useState(false);
  const hasReporter=reporterFields.some(field=>String(form.applicant[field.key]??"").trim());
  const [saved,setSaved]=useState<AidApplication|null>(initial??null),savedRef=useRef<AidApplication|null>(initial??null);
  const [documents,setDocuments]=useState<AidDetail["documents"]>(initial?.documents??[]);
  const [loaded,setLoaded]=useState(false),[saveState,setSaveState]=useState("local"),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [errors,setErrors]=useState<Record<string,string[]>>({}),[duplicate,setDuplicate]=useState<{nik:string;count:number;applications:AidApplicantHistory[]}|null>(null);
  const [photoReady,setPhotoReady]=useState(false),[missingPhotos,setMissingPhotos]=useState<string[]>([]),[result,setResult]=useState<AidApplication|null>(null),[toast,setToast]=useState("");
  const [olderDraft,setOlderDraft]=useState<LocalDraft|null>(null);
  const [manualDraft,setManualDraft]=useState<AidApplication|null>(null);
  const stopping=useRef(false),operation=useRef<"idle"|"save"|"advance"|"submit"|"cancel"|"done">("idle");
  const localSerial=useRef<Promise<void>>(Promise.resolve());
  const [leaveOpen,setLeaveOpen]=useState(false),[cancelled,setCancelled]=useState(false),[deleted,setDeleted]=useState(false);
  const [reuse,setReuse]=useState<{detail:AidDetail;mode:"auto"|"manual"}|null>(null);
  const serial=useRef<Promise<unknown>>(Promise.resolve()),lastPayload=useRef(""),formRef=useRef<HTMLFormElement>(null);
  const vaultKey="intake:"+(initial?.id??(direct?"new-direct":"new"));
  // Initial props can refresh after an upload. Hydrate drafts only on mount,
  // never overwrite the active form with a refreshed server snapshot.
  const initialSnapshot=useRef(initial);
  const writeLocal=useCallback((snapshot:IntakeState,row:AidApplication|null)=>{
    const pending=localSerial.current.catch(()=>undefined).then(async()=>{
      if(stopping.current||operation.current==="done")return;
      await putDraft(viewer.id,vaultKey,{form:snapshot,saved:row,updatedAt:new Date().toISOString()});
    });
    localSerial.current=pending;return pending;
  },[viewer.id,vaultKey]);
  const clearLocal=useCallback(async()=>{
    await localSerial.current.catch(()=>undefined);
    await removeDraft(viewer.id,vaultKey);
  },[viewer.id,vaultKey]);
  const persist=useCallback((snapshot:IntakeState,final=false):Promise<AidApplication>=>{
    const job=async()=>{
      if(stopping.current&&!final)throw new Error("Penyimpanan dihentikan karena pengajuan sedang dibatalkan.");
      const payload={source:snapshot.source,program:snapshot.program,region:snapshot.region,bypassReason:snapshot.bypassReason,draftKey:snapshot.draftKey,applicant:{...snapshot.applicant,intakeType:snapshot.applicant.intakeType??"new"},draft:!final&&(!savedRef.current||["draft","needs_data"].includes(savedRef.current.status))};
      const hash=JSON.stringify(payload);
      if(!final&&lastPayload.current===hash&&savedRef.current)return savedRef.current;
      setSaveState("saving");
      let row=savedRef.current;
      if(!row){
        row=await request<AidApplication>("applications",{method:"POST",body:JSON.stringify(payload)});
        savedRef.current=row;
      }
      // Updates serialize behind any in-flight save; upload never navigates or unmounts the form.
      row=await request<AidApplication>(`applications/${row.id}`,{method:"PUT",body:JSON.stringify({...payload,version:row.version})});
      savedRef.current=row;lastPayload.current=hash;setSaved(row);setSaveState("saved");
      if(!final)await writeLocal(snapshot,row).catch(()=>setToast("Data server tersimpan, tetapi salinan draft perangkat belum diperbarui."));
      return row;
    };
    const pending=serial.current.catch(()=>undefined).then(job).catch(error=>{setSaveState("local");throw error;});serial.current=pending;return pending;
  },[writeLocal]);
  const refreshDocuments=useCallback(async()=>{
    const row=savedRef.current;if(!row)return;
    const latest=await request<AidDetail>(`applications/${row.id}`);
    setDocuments(latest.documents);
  },[]);
  useEffect(()=>{
    let live=true;
    const initial=initialSnapshot.current;
    const viewer=restoreViewer.current;
    void getDraft<LocalDraft>(viewer.id,vaultKey).then(async stored=>{
      if(!live)return;
      if(stored){
        if(initial&&stored.saved&&stored.saved.version<initial.version)setOlderDraft(stored);
        else{
          // Restore local input before networking; an offline refresh must not
          // replace the recovered draft with an empty form.
          setForm({...stored.form,step:stored.form.formVersion===2?Math.min(3,stored.form.step):Math.max(0,Math.min(3,stored.form.step-(stored.form.step>=2?1:0))),formVersion:2});
          if(stored.saved){
            savedRef.current=stored.saved;setSaved(stored.saved);
            const row=await request<AidDetail>(`applications/${stored.saved.id}`);
            if(!canRestoreIntake(row.status,!!initial)&&!(initial&&hasAnyRole(viewer,["admin","call_center"]))){
              await removeDraft(viewer.id,vaultKey);
              if(!live)return;
              if(initial){stopping.current=true;router.replace(`/admin/bantuan/pengajuan/${row.id}${originQuery}`);return;}
              savedRef.current=null;lastPayload.current="";setSaved(null);setDocuments([]);
              setForm(current=>({...current,applicant:{incomePeriod:"bulan"},step:0,draftKey:crypto.randomUUID()}));
              setToast("Draft sebelumnya sudah diproses. Form baru siap diisi.");return;
            }
            if(!live)return;savedRef.current=row;setSaved(row);setDocuments(row.documents);
          }
        }
      }
    }).catch(async e=>{
      if(e instanceof RequestError&&e.status===404&&!initial){
        const stale=savedRef.current;
        if(stale)await discardLocalPhotos(viewer.id,stale.id);
        await removeDraft(viewer.id,vaultKey);
        if(live){savedRef.current=null;setSaved(null);setDocuments([]);setForm(current=>({...current,applicant:{incomePeriod:"bulan"},step:0,draftKey:crypto.randomUUID()}));}
      }else if(live)setError(e.message);
    }).finally(()=>{if(live)setLoaded(true);});
    return()=>{live=false;};
  },[viewer.id,vaultKey,router,originQuery]);
  useEffect(()=>{
    if(!loaded||busy||result||manualDraft||cancelled||stopping.current||operation.current!=="idle")return;
    const timer=setTimeout(()=>{
      if(stopping.current||operation.current!=="idle")return;
      void writeLocal(form,savedRef.current).then(()=>{
        if(stopping.current||operation.current!=="idle")return;
        if(String(form.applicant.name??"").trim()&&/^[0-9]{16}$/.test(String(form.applicant.nik??""))&&(form.source!=="bypass"||form.bypassReason.trim().length>=5)){
          void persist(form).catch(e=>{setSaveState("local");if(e instanceof RequestError&&e.status===409)setError(e.message);});
        }else setSaveState("local");
      }).catch(()=>{setError("Draft lokal belum tersimpan. Periksa ruang perangkat dan gunakan Simpan Draft ke server.");});
    },1000);
    return()=>clearTimeout(timer);
  },[form,loaded,busy,result,manualDraft,cancelled,writeLocal,persist]);
  useEffect(()=>{
    const nik=String(form.applicant.nik??"");if(!/^[0-9]{16}$/.test(nik))return;
    const controller=new AbortController(),timer=setTimeout(()=>{void request<{count:number;applications:AidApplicantHistory[]}>("duplicate-check",{method:"POST",signal:controller.signal,body:JSON.stringify({nik,excludeId:saved?.id??initial?.id})}).then(value=>setDuplicate({...value,nik})).catch(()=>undefined);},500);
    return()=>{clearTimeout(timer);controller.abort();};
  },[form.applicant.nik,initial,saved?.id]);
  const onPhotosReady=useCallback((ready:boolean,missing:string[])=>{setPhotoReady(ready);setMissingPhotos(missing);},[]);
  const update=(key:keyof IntakeState,value:IntakeState[keyof IntakeState])=>setForm(v=>({...v,[key]:value}));
  const setValues=(group:"applicant")=>(key:string,value:Values[string])=>setForm(v=>({...v,[group]:{...v[group],[key]:value}}));
  const fields=[...applicantFields,...(form.source==="bypass"?bypassFields:[])].map(f=>f.key==="housing"?{...f,options:viewer.settings.housing}:f);
  function applyPrevious(detail:AidDetail,mode:"auto"|"manual"){
    const applicant:Values=mode==="auto"?{...detail.applicant,problem:"",intakeType:"returning"}:{name:detail.applicant.name,nik:detail.applicant.nik,incomePeriod:"bulan",intakeType:"returning"};
    setForm(current=>({...current,applicant}));setErrors({});setError("");setReuse(null);
    setToast(mode==="auto"?"Data terakhir sudah diisi. Periksa kembali dan tulis kebutuhan bantuan saat ini.":"Nama dan NIK sudah diisi. Lengkapi kembali data pemohon lainnya.");
  }
  function selectPrevious(detail:AidDetail,mode:"auto"|"manual"){
    const hasInput=Object.entries(form.applicant).some(([key,value])=>!["incomePeriod","intakeType"].includes(key)&&value!==null&&value!==undefined&&value!=="");
    if(hasInput)setReuse({detail,mode});else applyPrevious(detail,mode);
  }
  async function cancelIntake(remove=false){
    if(operation.current!=="idle")return;
    const current=savedRef.current;
    if(current&&photoSnapshot(viewer.id,current.id).some(photo=>["uploading","preparing"].includes(photo.status))){
      setError("Tunggu unggahan foto selesai, lalu batalkan pengajuan.");setLeaveOpen(false);return;
    }
    operation.current="cancel";stopping.current=true;setBusy(true);setError("");
    if(current)pausePhotos(viewer.id,current.id,true);
    try{
      await serial.current.catch(()=>undefined);
      const row=savedRef.current;
      if(row){
        const latest=await request<AidDetail>(`applications/${row.id}`);
        if(!["draft","needs_data"].includes(latest.status))throw new Error("Pengajuan sudah diproses. Muat ulang untuk melihat tahap terbaru.");
        if(remove){
          if(latest.status!=="draft")throw new Error("Pengajuan sudah dikirim dan hanya dapat dibatalkan.");
          await request(`applications/${row.id}`,{method:"DELETE",body:JSON.stringify({version:latest.version})});
        }else await request(`applications/${row.id}/actions/cancel`,{method:"POST",body:JSON.stringify({version:latest.version,reason:"Dibatalkan saat pengisian oleh pembuat pengajuan."})});
      }
      operation.current="done";setDeleted(remove);setCancelled(true);setLeaveOpen(false);
      if(row)await discardLocalPhotos(viewer.id,row.id).catch(()=>undefined);
      await clearLocal().catch(()=>undefined);
    }catch(e){
      operation.current="idle";stopping.current=false;if(savedRef.current)pausePhotos(viewer.id,savedRef.current.id,false);
      setError(e instanceof Error?e.message:"Pengajuan belum berhasil dibatalkan.");setLeaveOpen(false);
    }finally{setBusy(false);}
  }
  async function saveDraft(exit=false){
    if(operation.current!=="idle"||!loaded)return;
    operation.current="save";setBusy(true);setError("");
    try{
      if(form.applicant.name&&/^[0-9]{16}$/.test(String(form.applicant.nik??""))){const draft=await persist(form);stopping.current=true;operation.current="done";setManualDraft(draft);}
      else{await writeLocal(form,savedRef.current);setSaveState("local");if(exit){stopping.current=true;operation.current="done";router.push(href(homeByRole[viewer.role]));}else setToast("Draft disimpan pada perangkat. Lengkapi nama dan NIK agar tersimpan ke server.");}
    }catch(e){setError(e instanceof Error?e.message:"Draft belum tersimpan.");}finally{if(operation.current==="save")operation.current="idle";setBusy(false);}
  }
  function validateStep(step:number):boolean{
    let current:Record<string,string[]>={};
    if(step===0){current=validateFields(fields.slice(0,12),form.applicant);if(form.source==="bypass"&&form.bypassReason.trim().length<5)current.bypassReason=["Alasan langsung minimal 5 karakter."];}
    if(step===1)current=validateFields(fields.slice(12),form.applicant);
    setErrors(current);if(Object.keys(current).length){setError("Periksa kolom yang ditandai sebelum melanjutkan.");return false;}return true;
  }
  async function next(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(operation.current!=="idle"||!loaded)return;setError("");
    if(!validateStep(form.step))return;
    if(form.step===2&&!editingProcessed&&!photoReady){setError("Foto belum lengkap atau masih mengunggah: "+missingPhotos.join(", "));return;}
    if(form.step<3){
      if(form.step===1){operation.current="advance";setBusy(true);try{await persist(form);}catch(e){setError(e instanceof Error?e.message:"Draft belum tersimpan.");return;}finally{operation.current="idle";setBusy(false);}}
      update("step",form.step+1);window.scrollTo({top:0,behavior:"smooth"});return;
    }
    operation.current="submit";stopping.current=true;setBusy(true);
    try{
      for(let step=0;step<2;step++)if(!validateStep(step)){update("step",step);return;}
      if(!editingProcessed&&!photoReady)throw new Error("Tunggu sampai seluruh foto wajib berhasil tersimpan.");
      if(editingProcessed){
        const updated=await persist(form,true);
        savedRef.current=updated;operation.current="done";setResult(updated);
        await clearLocal().catch(()=>undefined);
      }else await submitIntake({
        save:()=>persist(form,true),
        submit:row=>request<AidApplication>(`applications/${row.id}/actions/submit`,{method:"POST",body:JSON.stringify({version:row.version})}),
        committed:submitted=>{savedRef.current=submitted;operation.current="done";setResult(submitted);},
        cleanup:clearLocal,
      });
      window.scrollTo({top:0,behavior:"smooth"});
    }catch(e){if(e instanceof RequestError)setErrors(e.fields);setError(e instanceof Error?e.message:"Pengajuan belum berhasil dikirim. Isian tetap tersimpan.");}
    finally{if(String(operation.current)!=="done"){operation.current="idle";stopping.current=false;}setBusy(false);}
  }
  useEffect(()=>{
    if(!Object.keys(errors).length)return;
    const frame=requestAnimationFrame(()=>{
      const invalid=[...formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]')??[]].find(element=>element.getClientRects().length);
      invalid?.focus({preventScroll:true});invalid?.scrollIntoView({behavior:"smooth",block:"center"});
    });
    return()=>cancelAnimationFrame(frame);
  },[errors,form.step]);
  const closeToast=useCallback(()=>setToast(""),[]);
  if(cancelled)return <ProcessSuccess title={deleted?"Draft dihapus":"Pengajuan dibatalkan"} description={deleted?"Draft beserta foto dan isian lokal sudah dihapus. Anda bisa membuat pengajuan baru.":"Pengisian dihentikan dan draft lokal dibersihkan. Catatan server menjadi Dibatalkan dan tidak diteruskan ke proses bantuan."}/>;
  if(manualDraft)return <ProcessSuccess title={editingProcessed?"Perubahan berhasil disimpan":"Draft berhasil disimpan"} description={`${manualDraft.number}. Data tersimpan dan dapat dibuka kembali dari daftar pengajuan.`}/>;
  if(result)return <ProcessSuccess title={editingProcessed?"Perubahan berhasil disimpan":"Pengajuan berhasil dikirim"} description={`${result.number} · ${String(form.applicant.name)}. Data dan dokumen sudah tersimpan untuk proses berikutnya.`}/>;
  return <>
    <div className={s.heading}><div><Link className={s.backLink} href={href(homeByRole[viewer.role])} onClick={e=>{e.preventDefault();if(!busy)setLeaveOpen(true);}}><ChevronLeft size={15}/>Kembali ke antrean</Link><h1>{initial?"Lengkapi pengajuan":direct?"Ajukan langsung":"Pengajuan bantuan baru"}</h1><p>{editingProcessed?"Perbarui data pemohon tanpa mengubah tahap proses atau nominal bantuan.":"Isian otomatis disimpan sebagai draft. Pilih Batalkan pengajuan jika tidak jadi melanjutkan."}</p></div><span className={s.draftIndicator}>{saveState==="saving"?<LoaderCircle className={s.spin} size={15}/>:<CloudCheck size={16}/>} {!loaded?"Menyiapkan draft…":saveState==="saving"?"Menyimpan…":saveState==="saved"?"Draft tersimpan":"Draft pada perangkat"}</span></div>
    <PageGuide title={editingProcessed?"Cara memperbarui data":"Cara membuat pengajuan"} steps={editingProcessed?["Periksa dan ubah data yang diperlukan.","Simpan perubahan untuk kembali ke daftar. Status proses tetap sama."]:["Isi empat langkah: data pemohon, kondisi, foto, lalu periksa kembali.","Klik Lanjut untuk berpindah langkah. Simpan draft jika ingin berhenti dan melanjutkan nanti.","Pengajuan baru masuk proses setelah Anda menekan Kirim pengajuan pada langkah terakhir."]}/>
    {error&&<div className={`${s.notice} ${s.error}`} role="alert">{error}</div>}
    {olderDraft&&<div className={s.notice}><span>Ada draft lokal lebih lama. Data server terbaru tetap digunakan.</span><button className={s.textButton} onClick={()=>{setForm({...olderDraft.form,step:0,formVersion:2});setOlderDraft(null);}}>Pulihkan isian lokal</button></div>}
    {duplicate&&duplicate.nik===String(form.applicant.nik??"")&&<ApplicantHistory count={duplicate.count} applications={duplicate.applications}/>}
    <div className={`${s.wizardLayout} ${controls.layout}`}><aside className={`${s.wizardSteps} ${controls.sidebar}`}><p className={s.eyebrow}>LANGKAH PENGAJUAN</p>{labels.map((label,i)=><button key={label} type="button" disabled={busy||!loaded||i>form.step} onClick={()=>update("step",i)} data-active={i===form.step}><span>{i<form.step?"✓":i+1}</span><div><strong>{label}</strong><small>{i===form.step?"Sedang diisi":i<form.step?"Sudah dilewati":"Belum diisi"}</small></div></button>)}<div className={controls.actions}><div className={s.actions}><Button variant="secondary" type="button" disabled={busy} onClick={()=>void saveDraft()}><Save size={16}/>{editingProcessed?"Simpan perubahan & keluar":"Simpan draft & keluar"}</Button>{!editingProcessed&&<div className={s.actions} aria-label="Hapus atau batalkan pengajuan">{(!saved||saved.status==="draft")&&<Button variant="ghost" type="button" disabled={busy||!loaded} onClick={()=>setLeaveOpen(true)}>Hapus draft</Button>}{saved&&saved.status!=="draft"&&<Button variant="ghost" type="button" disabled={busy||!loaded} onClick={()=>setLeaveOpen(true)}>Batalkan pengajuan</Button>}</div>}<p className={controls.hint}>{form.step===3?"Periksa data sebelum mengirim.":"Langkah berikutnya: "+labels[form.step+1]}</p></div><div className={s.actions}>{form.step>0&&<Button variant="ghost" type="button" disabled={busy} onClick={()=>update("step",form.step-1)}><ChevronLeft size={16}/>Kembali</Button>}<Button type="submit" form={formId} disabled={busy||!loaded||form.step>=2&&!editingProcessed&&!photoReady}>{busy?<LoaderCircle className={s.spin} size={16}/>:null}{busy?"Menyimpan…":form.step===3?(editingProcessed?"Simpan perubahan":intakeStage(form.source,saved?.intakeRole??initial?.intakeRole??viewer.role)==="screening"?"Kirim ke Call Center":"Kirim pengajuan"):form.step===2?"Periksa pengajuan":"Lanjut"}{!busy&&<ChevronRight size={16}/>}</Button></div></div><p className={s.privacyNote}>Data dan dokumen hanya dapat dilihat petugas berwenang.</p></aside>
    <form id={formId} onSubmit={next} noValidate ref={formRef} className={s.wizardForm}>
      <div className={s.mobileProgress}><span>Langkah {form.step+1} dari 4</span><strong>{labels[form.step]}</strong><div><span style={{width:((form.step+1)/4*100)+"%"}}/></div></div>
      {!loaded&&<LoadingState variant="detail" label="Menyiapkan form dan draft…"/>}<fieldset disabled={busy||!loaded} hidden={!loaded} className={s.intakeFields}><div className={s.card}><div className={s.cardHeader}><div><h2>{labels[form.step]}</h2><p>{["Data identitas dan alamat calon penerima.","Ceritakan kondisi dan bantuan yang dibutuhkan.","Lampirkan foto sesuai sumber pengajuan.","Pastikan seluruh informasi sudah sesuai sebelum dikirim."][form.step]}</p></div><span className={s.stepCount}>{String(form.step+1).padStart(2,"0")} / 04</span></div><div className={s.cardBody}>
      {form.step===0&&<><MessageImport applicant={form.applicant} survey={form.source!=="online"?Object.fromEntries(surveyFields.map(f=>[f.key,form.applicant["assessment_"+f.key]])):undefined} labels={Object.fromEntries([...applicantFields,...reporterFields,...surveyFields].map(f=>[f.key,f.label]))} onApply={data=>{setForm(v=>({...v,applicant:{...v.applicant,...data.applicant,...Object.fromEntries(Object.entries(data.survey).map(([k,value])=>["assessment_"+k,value]))}}));setErrors({});}}/><div className={s.applicantType}><span>Jenis pengajuan</span><div role="radiogroup" aria-label="Jenis pengajuan"><button type="button" role="radio" aria-checked={form.applicant.intakeType!=="returning"} onClick={()=>setValues("applicant")("intakeType","new")}>Pemohon baru</button><button type="button" role="radio" aria-checked={form.applicant.intakeType==="returning"} onClick={()=>setValues("applicant")("intakeType","returning")}>Pemohon pernah mengajukan</button></div><small>Mengganti pilihan ini tidak menghapus isian yang sudah ada.</small></div>{form.applicant.intakeType==="returning"&&<ReturningApplicantPicker excludeId={saved?.id??initial?.id} onApply={selectPrevious}/>}<div className={s.formGrid}>
        <label className={s.field}><span>Bentuk kebutuhan</span><select className={s.input} value={String(form.applicant.requestCategory??"perorangan")} onChange={e=>setValues("applicant")("requestCategory",e.target.value)}>{["perorangan","renovasi rumah","air bersih","santunan rutin","bantuan janda","lainnya"].map(value=><option key={value} value={value}>{value}</option>)}</select><small>Untuk kebutuhan khusus, rincian kegiatan tersedia pada langkah Kondisi & kebutuhan. Jalur persetujuan tetap mengikuti sumber pengajuan.</small></label>
        <label className={s.field}><span>Sumber pengajuan <em>*</em></span><select className={s.input} value={form.source} disabled={direct||!!saved&&(saved.source==="bypass"||!["draft","needs_data"].includes(saved.status))} onChange={e=>update("source",e.target.value)}>{viewer.role!=="verifier"&&<><option value="online">Online / WhatsApp</option><option value="walk_in">Walk-in / datang langsung</option></>}{(viewer.canBypass||initial?.source==="bypass")&&<option value="bypass" disabled={!!saved&&saved.source!=="bypass"}>Ajukan langsung</option>}</select></label>
        <label className={s.field}><span>Program bantuan <em>*</em></span><select className={s.input} value={form.program} onChange={e=>update("program",e.target.value)}>{[...new Set([...viewer.settings.programs,"Lainnya"])].map(p=><option key={p}>{p}</option>)}</select></label>
        {form.source==="bypass"&&<label className={`${s.field} ${s.wide}`}><span>Alasan pengajuan langsung <em>*</em></span><textarea className={s.input} value={form.bypassReason} onChange={e=>update("bypassReason",e.target.value)} aria-invalid={!!errors.bypassReason}/>{errors.bypassReason&&<small className={s.fieldError}>{errors.bypassReason[0]}</small>}</label>}
      </div><div className={s.sectionDivider}/><Fields fields={fields.slice(0,12).filter(f=>!["village","district","city"].includes(f.key))} values={form.applicant} set={setValues("applicant")} prefix="applicant." errors={errors}/><AddressRegions values={form.applicant} set={setValues("applicant")}/><section aria-label="Data pelapor" style={{marginTop:28}}><label className={s.reporterToggle}><input type="checkbox" checked={reporterEnabled||hasReporter} aria-controls="reporter-fields" onChange={event=>{setReporterEnabled(event.target.checked);if(!event.target.checked)setForm(current=>({...current,applicant:{...current.applicant,...Object.fromEntries(reporterFields.map(field=>[field.key,""]))}}));}}/><span><strong>Tambahkan data pelapor</strong><small>Opsional · untuk orang yang mewakili pemohon</small></span></label><p className={s.privacyNote}>Isi jika pengajuan disampaikan orang lain mewakili pemohon. Identitas penerima tetap menggunakan data pemohon di atas.</p>{(reporterEnabled||hasReporter)&&<div id="reporter-fields"><Fields fields={reporterFields} values={form.applicant} set={setValues("applicant")} prefix="applicant." errors={errors}/><p className={s.privacyNote}>Hilangkan centang untuk menghapus data pelapor dari pengajuan ini.</p></div>}</section></>}
      {form.step===1&&<>{form.applicant.requestCategory&&form.applicant.requestCategory!=="perorangan"&&<section style={{marginBottom:28}}><h3 className={s.sectionTitle}>Rincian pengajuan khusus</h3><Fields fields={customFields} values={form.applicant} set={setValues("applicant")} prefix="applicant." errors={errors}/></section>}<Fields fields={fields.slice(12).filter(f=>!f.key.startsWith("bypass"))} values={form.applicant} set={setValues("applicant")} prefix="applicant." errors={errors}/>{form.source==="bypass"&&<section style={{marginTop:32}}><h3 className={s.sectionTitle}>Penilaian awal pengaju</h3><p className={s.privacyNote}>Jelaskan kondisi yang benar-benar Anda ketahui sebagai dasar keputusan Approver. Ini merupakan keterangan pengaju, bukan hasil survei verifikator.</p><Fields fields={bypassFields} values={form.applicant} set={setValues("applicant")} prefix="applicant." errors={errors}/></section>}</>}
      <div hidden={form.step!==2}><p className={s.privacyNote}>{form.source==="online"?"Pengajuan online: foto awal opsional. Foto KTP dan KK wajib dilengkapi oleh verifikator saat mengirim hasil survei.":form.source==="bypass"?"Pengajuan langsung: lengkapi gambaran kondisi yang sudah Anda ketahui. Semua foto opsional; beri keterangan pada bukti yang tersedia.":"Datang langsung: foto KTP dan wajah wajib. Foto KK dan pendukung opsional."}</p>{saved?<PhotoSlots owner={viewer.id} applicationId={saved.id} documents={documents} requirements={intakePhotos(form.source)} onReady={onPhotosReady} onUploaded={refreshDocuments}/>:<p>Lengkapi nama dan NIK lalu lanjutkan agar foto terhubung ke draft Anda.</p>}</div>
      {form.step===3&&<div className={s.reviewPage}><section className={s.reviewBlock}><div><h3>Tipe pengajuan</h3></div><label className={s.field}>Sumber pengajuan<select className={s.input} value={form.source} disabled={direct||form.source==="bypass"||!!saved&&!["draft","needs_data"].includes(saved.status)} onChange={e=>update("source",e.target.value)}><option value="online">Online / WhatsApp</option><option value="walk_in">Walk-in / datang langsung</option>{form.source==="bypass"&&<option value="bypass">Ajukan langsung</option>}</select><small>Mengubah sumber tidak menghapus isian atau foto. Datang langsung wajib foto KTP dan wajah.</small></label></section><div className={s.reviewNotice}><CheckCircle2 size={22}/><span>Periksa sekali lagi. Setelah dikirim, pengajuan masuk ke {form.source==="bypass"?"antrean keputusan langsung":intakeStage(form.source,saved?.intakeRole??initial?.intakeRole??viewer.role)==="screening"?"review Call Center":"antrean Approver"}.</span></div>{[
        ["Data pemohon",[["Jenis pengajuan",form.applicant.intakeType==="returning"?"Pemohon pernah mengajukan":"Pemohon baru"],["Nama",form.applicant.name],["NIK",form.applicant.nik],["Alamat",[form.applicant.street,form.applicant.village,form.applicant.district,form.applicant.city].filter(Boolean).join(", ")],["Program",form.program]]],
        ["Kondisi & kebutuhan",[["Pekerjaan",form.applicant.job],["Penghasilan","Rp "+Number(form.applicant.income??0).toLocaleString("id-ID")+" / "+form.applicant.incomePeriod],["Tanggungan",form.applicant.dependentCount],["Masalah",form.applicant.problem]]],
      ...(form.source==="bypass"?[["Penilaian awal pengaju",bypassFields.map(f=>[f.label,form.applicant[f.key]])]]:[]),
      ].map(([title,rows],i)=><section className={s.reviewBlock} key={String(title)}><div><h3>{String(title)}</h3><button type="button" className={s.textButton} onClick={()=>update("step",Math.min(i,1))}>Ubah</button></div><dl>{(rows as unknown as [string,unknown][]).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{String(value??"—")}</dd></div>)}</dl></section>)}<section className={s.reviewBlock}><div><h3>Foto & dokumen</h3><button type="button" className={s.textButton} onClick={()=>update("step",2)}>Periksa foto</button></div><p>{photoReady?"✓ Kelengkapan foto sesuai sumber pengajuan sudah terpenuhi.":"Foto belum lengkap atau masih mengunggah."}</p>{saved&&<PhotoReview owner={viewer.id} applicationId={saved.id} documents={documents}/>}</section></div>}
      </div></div></fieldset>

    </form></div>{leaveOpen&&<Dialog title="Keluar dari pengisian?" description="Kembali saja tetap menyimpan draft. Jika pengajuan tidak jadi, pilih Batalkan pengajuan. Draft yang belum dikirim bisa dihapus permanen. Setelah dikirim, pengajuan hanya dapat dibatalkan." onClose={()=>!busy&&setLeaveOpen(false)}><div className={s.actions}><Button type="button" variant="secondary" disabled={busy} onClick={()=>setLeaveOpen(false)}>Lanjut isi</Button><Button type="button" variant="secondary" disabled={busy} onClick={()=>{setLeaveOpen(false);void saveDraft(true);}}>{editingProcessed?"Simpan perubahan & keluar":"Simpan draft & keluar"}</Button>{(!saved||saved.status==="draft")&&<Button type="button" variant="danger" disabled={busy} onClick={()=>void cancelIntake(true)}>Hapus draft permanen</Button>}{!editingProcessed&&<Button type="button" variant="danger" disabled={busy} onClick={()=>void cancelIntake()}>{busy?"Membatalkan…":"Batalkan pengajuan"}</Button>}</div></Dialog>}{reuse&&<Dialog title="Gunakan data pemohon ini?" description="Isian pemohon yang sudah terisi akan diganti. Pengajuan lama tidak diubah. Foto yang sudah diunggah pada draft ini tetap ada; periksa agar sesuai pemohon yang dipilih." onClose={()=>setReuse(null)}><div className={s.actions}><Button type="button" variant="secondary" onClick={()=>setReuse(null)}>Batal</Button><Button type="button" onClick={()=>applyPrevious(reuse.detail,reuse.mode)}>Ya, gunakan data ini</Button></div></Dialog>}{toast&&<Toast message={toast} onClose={closeToast}/>}
  </>;
}

