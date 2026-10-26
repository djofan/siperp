"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, CloudCheck, LoaderCircle, Save } from "lucide-react";
import type { AidDetail, AidApplication, AidValues, BantuanViewer } from "@/contracts/modules/bantuan";
import { fieldMessage, request, RequestError } from "../api/client";
import { getDraft, putDraft, removeDraft } from "../api/vault";
import { href, homeByRole } from "../policy";
import { Button, Toast } from "./ui";
import { ProcessSuccess } from "./ProcessSuccess";
import { PhotoSlots, intakePhotos } from "./PhotoSlots";
import { PhotoReview } from "./PhotoReview";
import s from "./Workspace.module.css";
import { DependentsEditor } from "./Dependents";
import { dependentErrors } from "../dependents";

export type Values = AidValues;
export type Field = { key: string; label: string; type?: string; options?: string[]; wide?: boolean; optional?: boolean; hint?: string };
export const applicantFields: Field[] = [
  {key:"name",label:"Nama lengkap"}, {key:"nik",label:"NIK",type:"nik",hint:"16 digit. Pengajuan sebelumnya akan ditandai, bukan diblokir."},
  {key:"birthPlace",label:"Tempat lahir"}, {key:"birthDate",label:"Tanggal lahir",type:"date"},
  {key:"gender",label:"Jenis kelamin",options:["laki_laki","perempuan"]}, {key:"maritalStatus",label:"Status pernikahan",options:["Menikah","Duda","Janda","Janda mati","Belum menikah"]},
  {key:"street",label:"Jalan / dusun",wide:true}, {key:"rtRw",label:"RT / RW"}, {key:"village",label:"Desa / kelurahan"},
  {key:"district",label:"Kecamatan"}, {key:"city",label:"Kabupaten / kota"},
  {key:"housing",label:"Status tempat tinggal",options:["Milik sendiri","Tinggalan orang tua","Kontrak-sewa","Menumpang","Lainnya"]},
  {key:"rent",label:"Biaya sewa (Rp)",type:"number",optional:true},
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
export function validateFields(fields:Field[],values:Values):Record<string,string[]>{
  const errors:Record<string,string[]>={};
  for(const f of fields){
    if(f.key==="rent"&&values.housing!=="Kontrak-sewa")continue;
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
  return <div className={s.formGrid}>{fields.filter(f=>(f.key!=="rent"||values.housing==="Kontrak-sewa")&&(f.key!=="willingSktm"||values.hasSktm===false)).map(f=>{
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
  const [form,setForm]=useState<IntakeState>(()=>({applicant:initial?.applicant??{incomePeriod:"bulan"},source:initial?.source??(direct||viewer.role==="verifier"?"bypass":"online"),program:initial?.program??viewer.settings.programs[0],region:initial?.region??"",bypassReason:initial?.bypassReason??"",step:0,formVersion:2,draftKey:initial?.id??crypto.randomUUID()}));
  const [saved,setSaved]=useState<AidApplication|null>(initial??null),savedRef=useRef<AidApplication|null>(initial??null);
  const [documents,setDocuments]=useState<AidDetail["documents"]>(initial?.documents??[]);
  const [loaded,setLoaded]=useState(false),[saveState,setSaveState]=useState("local"),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [errors,setErrors]=useState<Record<string,string[]>>({}),[duplicate,setDuplicate]=useState<number|null>(null);
  const [photoReady,setPhotoReady]=useState(false),[missingPhotos,setMissingPhotos]=useState<string[]>([]),[result,setResult]=useState<AidApplication|null>(null),[toast,setToast]=useState("");
  const [olderDraft,setOlderDraft]=useState<LocalDraft|null>(null);
  const [manualDraft,setManualDraft]=useState<AidApplication|null>(null);
  const serial=useRef<Promise<unknown>>(Promise.resolve()),lastPayload=useRef(""),formRef=useRef<HTMLFormElement>(null);
  const vaultKey="intake:"+(initial?.id??(direct?"new-direct":"new"));
  // Initial props can refresh after an upload. Hydrate drafts only on mount,
  // never overwrite the active form with a refreshed server snapshot.
  const initialSnapshot=useRef(initial);
  const persist=useCallback((snapshot:IntakeState,final=false):Promise<AidApplication>=>{
    const job=async()=>{
      const payload={...snapshot,applicant:snapshot.applicant,draft:!final&&(!savedRef.current||["draft","needs_data"].includes(savedRef.current.status))};
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
      await putDraft(viewer.id,vaultKey,{form:snapshot,saved:row,updatedAt:new Date().toISOString()});
      return row;
    };
    const pending=serial.current.catch(()=>undefined).then(job);serial.current=pending;return pending;
  },[viewer.id,vaultKey]);
  const refreshDocuments=useCallback(async()=>{
    const row=savedRef.current;if(!row)return;
    const latest=await request<AidDetail>(`applications/${row.id}`);
    setDocuments(latest.documents);
  },[]);
  useEffect(()=>{
    let live=true;
    const initial=initialSnapshot.current;
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
            if(!["draft","needs_data","screening"].includes(row.status)){if(live)setResult(row);return;}
            if(!live)return;savedRef.current=row;setSaved(row);setDocuments(row.documents);
          }
        }
      }
    }).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoaded(true);});
    return()=>{live=false;};
  },[viewer.id,vaultKey]);
  useEffect(()=>{
    if(!loaded||result||manualDraft)return;
    const timer=setTimeout(()=>{
      void putDraft(viewer.id,vaultKey,{form,saved:savedRef.current,updatedAt:new Date().toISOString()}).then(()=>{
        if(String(form.applicant.name??"").trim()&&/^[0-9]{16}$/.test(String(form.applicant.nik??""))&&(form.source!=="bypass"||form.bypassReason.trim().length>=5)){
          void persist(form).catch(e=>{setSaveState("local");if(e instanceof RequestError&&e.status===409)setError(e.message);});
        }else setSaveState("local");
      }).catch(()=>{setError("Draft lokal belum tersimpan. Periksa ruang perangkat dan gunakan Simpan Draft ke server.");});
    },1000);
    return()=>clearTimeout(timer);
  },[form,loaded,result,manualDraft,viewer.id,vaultKey,persist]);
  useEffect(()=>{
    const nik=String(form.applicant.nik??"");if(!/^[0-9]{16}$/.test(nik))return;
    const controller=new AbortController(),timer=setTimeout(()=>{void request<{count:number}>("duplicate-check",{method:"POST",signal:controller.signal,body:JSON.stringify({nik})}).then(value=>setDuplicate(Math.max(0,value.count-(initial?1:0)))).catch(()=>undefined);},500);
    return()=>{clearTimeout(timer);controller.abort();};
  },[form.applicant.nik,initial]);
  const onPhotosReady=useCallback((ready:boolean,missing:string[])=>{setPhotoReady(ready);setMissingPhotos(missing);},[]);
  const update=(key:keyof IntakeState,value:IntakeState[keyof IntakeState])=>setForm(v=>({...v,[key]:value}));
  const setValues=(group:"applicant")=>(key:string,value:Values[string])=>setForm(v=>({...v,[group]:{...v[group],[key]:value}}));
  const fields=applicantFields.map(f=>f.key==="housing"?{...f,options:viewer.settings.housing}:f);
  async function saveDraft(){
    setBusy(true);setError("");
    try{
      await putDraft(viewer.id,vaultKey,{form,saved:savedRef.current,updatedAt:new Date().toISOString()});
      if(form.applicant.name&&/^[0-9]{16}$/.test(String(form.applicant.nik??""))){const draft=await persist(form);setManualDraft(draft);}
      else{setSaveState("local");setToast("Draft disimpan pada perangkat. Lengkapi nama dan NIK agar tersimpan ke server.");}
    }catch(e){setError(e instanceof Error?e.message:"Draft belum tersimpan.");}finally{setBusy(false);}
  }
  function validateStep(step:number):boolean{
    let current:Record<string,string[]>={};
    if(step===0){current=validateFields(fields.slice(0,12),form.applicant);if(form.source==="bypass"&&form.bypassReason.trim().length<5)current.bypassReason=["Alasan langsung minimal 5 karakter."];}
    if(step===1)current=validateFields(fields.slice(12),form.applicant);
    setErrors(current);if(Object.keys(current).length){setError("Periksa kolom yang ditandai sebelum melanjutkan.");return false;}return true;
  }
  async function next(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");
    if(!validateStep(form.step))return;
    if(form.step===2&&!photoReady){setError("Foto belum lengkap atau masih mengunggah: "+missingPhotos.join(", "));return;}
    if(form.step<3){
      if(form.step===1){setBusy(true);try{await persist(form);}catch(e){setError(e instanceof Error?e.message:"Draft belum tersimpan.");setBusy(false);return;}setBusy(false);}
      update("step",form.step+1);window.scrollTo({top:0,behavior:"smooth"});return;
    }
    setBusy(true);
    try{
      for(let step=0;step<2;step++)if(!validateStep(step)){update("step",step);return;}
      if(!photoReady)throw new Error("Tunggu sampai seluruh foto wajib berhasil tersimpan.");
      const row=await persist(form,true),submitted=row.status==="screening"?row:await request<AidApplication>(`applications/${row.id}/actions/submit`,{method:"POST",body:JSON.stringify({version:row.version})});
      savedRef.current=submitted;await removeDraft(viewer.id,vaultKey);setResult(submitted);window.scrollTo({top:0,behavior:"smooth"});
    }catch(e){if(e instanceof RequestError)setErrors(e.fields);setError(e instanceof Error?e.message:"Pengajuan belum berhasil dikirim. Isian tetap tersimpan.");}
    finally{setBusy(false);}
  }
  const closeToast=useCallback(()=>setToast(""),[]);
  if(manualDraft)return <ProcessSuccess title="Draft berhasil disimpan" description={`${manualDraft.number}. Anda bisa membuka draft ini lagi dari daftar pengajuan untuk melanjutkan pengisian.`}/>;
  if(result)return <ProcessSuccess title="Pengajuan berhasil dikirim" description={`${result.number} · ${String(form.applicant.name)}. Data dan dokumen sudah tersimpan untuk proses berikutnya.`}/>;
  return <>
    <div className={s.heading}><div><Link className={s.backLink} href={href(homeByRole[viewer.role])}><ChevronLeft size={15}/>Kembali ke antrean</Link><h1>{initial?"Lengkapi pengajuan":direct?"Ajukan langsung":"Pengajuan bantuan baru"}</h1><p>Isi bertahap. Draft dan foto tidak hilang saat Anda berpindah langkah.</p></div><span className={s.draftIndicator}>{saveState==="saving"?<LoaderCircle className={s.spin} size={15}/>:<CloudCheck size={16}/>} {saveState==="saving"?"Menyimpan…":saveState==="saved"?"Draft tersimpan":"Draft pada perangkat"}</span></div>
    {error&&<div className={`${s.notice} ${s.error}`} role="alert">{error}</div>}
    {olderDraft&&<div className={s.notice}><span>Ada draft lokal lebih lama. Data server terbaru tetap digunakan.</span><button className={s.textButton} onClick={()=>{setForm({...olderDraft.form,step:0,formVersion:2});setOlderDraft(null);}}>Pulihkan isian lokal</button></div>}
    {duplicate!==null&&duplicate>0&&<div className={s.notice}>NIK ini tercatat pada {duplicate} pengajuan lain. Ini peringatan, bukan penolakan otomatis.</div>}
    <div className={s.wizardLayout}><aside className={s.wizardSteps}><p className={s.eyebrow}>LANGKAH PENGAJUAN</p>{labels.map((label,i)=><button key={label} type="button" disabled={i>form.step} onClick={()=>update("step",i)} data-active={i===form.step}><span>{i<form.step?"✓":i+1}</span><div><strong>{label}</strong><small>{i===form.step?"Sedang diisi":i<form.step?"Sudah dilewati":"Belum diisi"}</small></div></button>)}<p className={s.privacyNote}>Data dan dokumen hanya dapat dilihat petugas berwenang.</p></aside>
    <form onSubmit={next} noValidate ref={formRef} className={s.wizardForm}>
      <div className={s.mobileProgress}><span>Langkah {form.step+1} dari 4</span><strong>{labels[form.step]}</strong><div><span style={{width:((form.step+1)/4*100)+"%"}}/></div></div>
      <div className={s.card}><div className={s.cardHeader}><div><h2>{labels[form.step]}</h2><p>{["Data identitas dan alamat calon penerima.","Ceritakan kondisi dan bantuan yang dibutuhkan.","Lampirkan foto sesuai sumber pengajuan.","Pastikan seluruh informasi sudah sesuai sebelum dikirim."][form.step]}</p></div><span className={s.stepCount}>{String(form.step+1).padStart(2,"0")} / 04</span></div><div className={s.cardBody}>
      {form.step===0&&<><div className={s.formGrid}>
        <label className={s.field}><span>Sumber pengajuan <em>*</em></span><select className={s.input} value={form.source} disabled={direct||!!saved&&(saved.source==="bypass"||!["draft","needs_data"].includes(saved.status))} onChange={e=>update("source",e.target.value)}>{viewer.role!=="verifier"&&<><option value="online">Online / WhatsApp</option><option value="walk_in">Walk-in / datang langsung</option></>}{(viewer.canBypass||initial?.source==="bypass")&&<option value="bypass" disabled={!!saved&&saved.source!=="bypass"}>Ajukan langsung</option>}</select></label>
        <label className={s.field}><span>Program bantuan <em>*</em></span><select className={s.input} value={form.program} onChange={e=>update("program",e.target.value)}>{viewer.settings.programs.map(p=><option key={p}>{p}</option>)}</select></label>
        {form.source==="bypass"&&<label className={`${s.field} ${s.wide}`}><span>Alasan pengajuan langsung <em>*</em></span><textarea className={s.input} value={form.bypassReason} onChange={e=>update("bypassReason",e.target.value)} aria-invalid={!!errors.bypassReason}/>{errors.bypassReason&&<small className={s.fieldError}>{errors.bypassReason[0]}</small>}</label>}
      </div><div className={s.sectionDivider}/><Fields fields={fields.slice(0,12)} values={form.applicant} set={setValues("applicant")} prefix="applicant." errors={errors}/></>}
      {form.step===1&&<Fields fields={fields.slice(12)} values={form.applicant} set={setValues("applicant")} prefix="applicant." errors={errors}/>}
      <div hidden={form.step!==2}><p className={s.privacyNote}>{form.source==="online"?"Pengajuan WhatsApp: semua foto pada tahap pengajuan ini opsional. Unggah jika tersedia.":"Datang langsung: foto KTP dan wajah wajib. Foto KK dan pendukung opsional."}</p>{saved?<PhotoSlots owner={viewer.id} applicationId={saved.id} documents={documents} requirements={intakePhotos(form.source)} onReady={onPhotosReady} onUploaded={refreshDocuments}/>:<p>Lengkapi nama dan NIK lalu lanjutkan agar foto terhubung ke draft Anda.</p>}</div>
      {form.step===3&&<div className={s.reviewPage}><section className={s.reviewBlock}><div><h3>Tipe pengajuan</h3></div><label className={s.field}>Sumber pengajuan<select className={s.input} value={form.source} disabled={direct||form.source==="bypass"||!!saved&&!["draft","needs_data"].includes(saved.status)} onChange={e=>update("source",e.target.value)}><option value="online">Online / WhatsApp</option><option value="walk_in">Walk-in / datang langsung</option>{form.source==="bypass"&&<option value="bypass">Ajukan langsung</option>}</select><small>Mengubah sumber tidak menghapus isian atau foto. Datang langsung wajib foto KTP dan wajah.</small></label></section><div className={s.reviewNotice}><CheckCircle2 size={22}/><span>Periksa sekali lagi. Setelah dikirim, pengajuan masuk ke {form.source==="bypass"?"antrean keputusan langsung":form.source==="online"?"antrean approver":"antrean screening"}.</span></div>{[
        ["Data pemohon",[["Nama",form.applicant.name],["NIK",form.applicant.nik],["Alamat",[form.applicant.street,form.applicant.village,form.applicant.district,form.applicant.city].filter(Boolean).join(", ")],["Program",form.program]]],
        ["Kondisi & kebutuhan",[["Pekerjaan",form.applicant.job],["Penghasilan","Rp "+Number(form.applicant.income??0).toLocaleString("id-ID")+" / "+form.applicant.incomePeriod],["Tanggungan",form.applicant.dependentCount],["Masalah",form.applicant.problem]]],
      ].map(([title,rows],i)=><section className={s.reviewBlock} key={String(title)}><div><h3>{String(title)}</h3><button type="button" className={s.textButton} onClick={()=>update("step",i)}>Ubah</button></div><dl>{(rows as unknown as [string,unknown][]).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{String(value??"—")}</dd></div>)}</dl></section>)}<section className={s.reviewBlock}><div><h3>Foto & dokumen</h3><button type="button" className={s.textButton} onClick={()=>update("step",2)}>Periksa foto</button></div><p>{photoReady?"✓ Kelengkapan foto sesuai sumber pengajuan sudah terpenuhi.":"Foto belum lengkap atau masih mengunggah."}</p>{saved&&<PhotoReview owner={viewer.id} applicationId={saved.id} documents={documents}/>}</section></div>}
      </div></div>
      <div className={s.formFooter}><Button variant="secondary" type="button" disabled={busy} onClick={()=>void saveDraft()}><Save size={16}/>Simpan draft</Button><div className={s.actions}>{form.step>0&&<Button variant="ghost" type="button" disabled={busy} onClick={()=>update("step",form.step-1)}><ChevronLeft size={16}/>Kembali</Button>}<Button disabled={busy||!loaded||form.step>=2&&!photoReady}>{busy?<LoaderCircle className={s.spin} size={16}/>:null}{busy?"Menyimpan…":form.step===3?"Kirim pengajuan":form.step===2?"Periksa pengajuan":"Lanjut"}{!busy&&<ChevronRight size={16}/>}</Button></div></div>
    </form></div>{toast&&<Toast message={toast} onClose={closeToast}/>}
  </>;
}

