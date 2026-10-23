"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, CloudCheck, LoaderCircle, Save } from "lucide-react";
import type { AidDetail, AidApplication, BantuanViewer } from "@/contracts/modules/bantuan";
import { fieldMessage, request, RequestError } from "../api/client";
import { getDraft, putDraft, removeDraft } from "../api/vault";
import { nextStep, href, homeByRole } from "../policy";
import { Button, Card, Toast } from "./ui";
import { PhotoSlots, intakePhotos } from "./PhotoSlots";
import s from "./Workspace.module.css";

export type Values = Record<string, string | number | boolean | null>;
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
  {key:"dependentCount",label:"Jumlah tanggungan",type:"number"}, {key:"dependents",label:"Rincian tanggungan",optional:true,hint:"Contoh: istri, anak SMA, anak SMP"},
  {key:"prayer",label:"Sholat 5 waktu",options:["Ya","Jarang","Tidak"]}, {key:"smoking",label:"Merokok",options:["Ya","Jarang","Tidak"]},
  {key:"previousAid",label:"Pernah menerima bantuan?",type:"boolean"}, {key:"previousAidNotes",label:"Keterangan bantuan sebelumnya",optional:true},
  {key:"publicationConsent",label:"Bersedia dipublikasi?",type:"boolean",hint:"Hanya mencatat persetujuan. Modul ini tidak mempublikasikan data."},
  {key:"willingSktm",label:"Bersedia mengurus SKTM?",type:"boolean"},
  {key:"informationSource",label:"Mendapat informasi LAZSIP dari"},
  {key:"problem",label:"Masalah yang dihadapi",type:"textarea",wide:true},
];
export const reporterFields: Field[] = [
  {key:"date",label:"Tanggal laporan",type:"date"}, {key:"name",label:"Nama pelapor"},
  {key:"maritalStatus",label:"Status pernikahan",options:["Menikah","Belum menikah","Duda","Janda","Janda mati"]},
  {key:"type",label:"Jenis pelapor",options:["Yayasan","Lembaga","Perorangan"]},
  {key:"phone",label:"Nomor telepon",type:"tel"}, {key:"address",label:"Alamat pelapor",type:"textarea",wide:true},
];

export function validateFields(fields:Field[],values:Values):Record<string,string[]>{
  const errors:Record<string,string[]>={};
  for(const f of fields){
    if(f.key==="rent"&&values.housing!=="Kontrak-sewa")continue;
    const value=values[f.key];
    if(!f.optional&&(value===undefined||value===null||value===""))errors[f.key]=["Kolom ini wajib diisi."];
    else if(f.type==="nik"&&!/^[0-9]{16}$/.test(String(value??"")))errors[f.key]=["NIK harus terdiri dari 16 digit angka."];
    else if(f.type==="date"&&value&&new Date(String(value))>new Date())errors[f.key]=["Tanggal tidak boleh melewati hari ini."];
    else if(f.type==="number"&&value!==""&&value!==undefined&&value!==null&&(!Number.isInteger(Number(value))||Number(value)<0))errors[f.key]=["Masukkan angka bulat, minimal 0."];
  }return errors;
}
export function Fields({fields,values,set,prefix="",required=true,errors={},original,onBlur}:{fields:Field[];values:Values;set:(key:string,value:string|number|boolean)=>void;prefix?:string;required?:boolean;errors?:Record<string,string[]>;original?:Values;onBlur?:(key:string)=>void}){
  const [touched,setTouched]=useState<Record<string,boolean>>({});
  const [today]=useState(()=>new Date());
  const localErrors=required?validateFields(fields,values):{};
  const blur=(key:string)=>{setTouched(v=>({...v,[key]:true}));onBlur?.(key);};
  return <div className={s.formGrid}>{fields.filter(f=>f.key!=="rent"||values.housing==="Kontrak-sewa").map(f=>{
    const id=prefix+f.key,error=errors[id]?.[0]??errors[f.key]?.[0]??(touched[f.key]?localErrors[f.key]?.[0]:undefined);
    const changed=original&&String(original[f.key]??"")!==String(values[f.key]??"");
    const segmented=f.type==="boolean"||["prayer","smoking"].includes(f.key);
    const options=f.type==="boolean"?["true","false"]:f.options??[];
    const rupiah=["income","rent"].includes(f.key);
    const birth=String(values.birthDate??""),date=new Date(birth);
    const age=birth?today.getFullYear()-date.getFullYear()-(today.getMonth()<date.getMonth()||today.getMonth()===date.getMonth()&&today.getDate()<date.getDate()?1:0):null;
    return <div className={`${s.field} ${f.wide||f.key==="dependents"?s.wide:""} ${changed?s.changedField:""}`} key={id}>
      <label htmlFor={segmented?id+"-0":id}>{f.label}{!f.optional&&required&&<em> *</em>}{changed&&<span className={s.changedLabel}>Diubah</span>}</label>
      {f.key==="dependents"?<div className={s.repeater}>
        {String(values.dependents??"").split("\n").filter(Boolean).map((line,i,lines)=>{
          const pair=line.split(" — ");
          const change=(part:number,value:string)=>{const p=[...pair];p[part]=value;set("dependents",lines.map((l,n)=>n===i?p.join(" — "):l).join("\n"));};
          return <div className={s.repeaterRow} key={i}><input className={s.input} aria-label={`Hubungan tanggungan ${i+1}`} placeholder="Hubungan, mis. anak" value={pair[0]??""} onChange={e=>change(0,e.target.value)}/><input className={s.input} aria-label={`Keterangan tanggungan ${i+1}`} placeholder="Keterangan, mis. SMA" value={pair.slice(1).join(" — ")} onChange={e=>change(1,e.target.value)}/><button type="button" className={s.iconButton} aria-label="Hapus tanggungan" onClick={()=>set("dependents",lines.filter((_,n)=>n!==i).join("\n"))}>×</button></div>;
        })}
        <Button type="button" variant="ghost" onClick={()=>set("dependents",(values.dependents?String(values.dependents)+"\n":"")+" — ")}>+ Tambah tanggungan</Button>
      </div>:segmented?<div className={s.segmented} role="radiogroup" aria-label={f.label}>{options.map((o,i)=><button key={o} id={id+"-"+i} type="button" role="radio" aria-checked={String(values[f.key])===o} onClick={()=>{set(f.key,f.type==="boolean"?o==="true":o);blur(f.key);}}>{o==="true"?"Ya":o==="false"?"Tidak":o}</button>)}</div>:
      f.options?<select id={id} className={s.input} name={id} value={String(values[f.key]??"")} aria-invalid={!!error} onBlur={()=>blur(f.key)} onChange={e=>set(f.key,e.target.value)}><option value="">Pilih…</option>{options.map(o=><option key={o} value={o}>{o.replaceAll("_"," ")}</option>)}</select>:
      f.type==="textarea"?<textarea id={id} className={s.input} name={id} value={String(values[f.key]??"")} aria-invalid={!!error} onBlur={()=>blur(f.key)} maxLength={10000} onChange={e=>set(f.key,e.target.value)}/>:
      <div className={rupiah?s.moneyInput:undefined}>{rupiah&&<span>Rp</span>}<input id={id} className={s.input} name={id} type={rupiah||f.type==="nik"?"text":f.type??"text"} inputMode={rupiah||f.type==="nik"||f.type==="number"?"numeric":undefined} maxLength={f.type==="nik"?16:1000} max={f.type==="date"?today.toLocaleDateString("en-CA"):undefined} min={f.type==="number"?0:undefined} value={rupiah&&values[f.key]!==undefined&&values[f.key]!==""?Number(values[f.key]).toLocaleString("id-ID"):String(values[f.key]??"")} aria-invalid={!!error} onBlur={()=>blur(f.key)} onChange={e=>set(f.key,rupiah?e.target.value.replace(/[^0-9]/g,"")?Number(e.target.value.replace(/[^0-9]/g,"")):"":f.type==="number"?e.target.value===""?"":Number(e.target.value):e.target.value)}/></div>}
      {error?<small role="alert" className={s.fieldError}>{fieldMessage(error)}</small>:f.key==="birthDate"&&age!==null&&age>=0?<small>Usia {age} tahun</small>:f.hint&&<small>{f.hint}</small>}
    </div>;
  })}</div>;
}

type IntakeState={applicant:Values;reporter:Values;source:string;program:string;region:string;bypassReason:string;step:number;draftKey:string};
type LocalDraft={form:IntakeState;saved:AidApplication|null;updatedAt:string};
const labels=["Data pemohon","Kondisi & kebutuhan","Data pelapor","Foto & dokumen","Periksa & kirim"];
export function IntakeForm({viewer,initial,direct=false}:{viewer:BantuanViewer;initial?:AidDetail;direct?:boolean}){
  const [form,setForm]=useState<IntakeState>(()=>({applicant:initial?.applicant??{incomePeriod:"bulan"},reporter:initial?.reporter??{date:new Date().toLocaleDateString("en-CA"),type:"Perorangan"},source:initial?.source??(direct||viewer.role==="verifier"?"bypass":"online"),program:initial?.program??viewer.settings.programs[0],region:initial?.region??"",bypassReason:initial?.bypassReason??"",step:0,draftKey:initial?.id??crypto.randomUUID()}));
  const [saved,setSaved]=useState<AidApplication|null>(initial??null),savedRef=useRef<AidApplication|null>(initial??null);
  const [documents,setDocuments]=useState<AidDetail["documents"]>(initial?.documents??[]);
  const [loaded,setLoaded]=useState(false),[saveState,setSaveState]=useState("local"),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [errors,setErrors]=useState<Record<string,string[]>>({}),[duplicate,setDuplicate]=useState<number|null>(null);
  const [photoReady,setPhotoReady]=useState(false),[missingPhotos,setMissingPhotos]=useState<string[]>([]),[result,setResult]=useState<AidApplication|null>(null),[toast,setToast]=useState("");
  const [olderDraft,setOlderDraft]=useState<LocalDraft|null>(null);
  const serial=useRef<Promise<unknown>>(Promise.resolve()),lastPayload=useRef(""),formRef=useRef<HTMLFormElement>(null);
  const vaultKey="intake:"+(initial?.id??(direct?"new-direct":"new"));
  // Initial props can refresh after an upload. Hydrate drafts only on mount,
  // never overwrite the active form with a refreshed server snapshot.
  const initialSnapshot=useRef(initial);
  const persist=useCallback((snapshot:IntakeState,final=false):Promise<AidApplication>=>{
    const job=async()=>{
      const payload={...snapshot,reporter:snapshot.reporter,applicant:snapshot.applicant,draft:!final&&(!savedRef.current||["draft","needs_data"].includes(savedRef.current.status))};
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
          setForm(stored.form);
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
    if(!loaded||result)return;
    const timer=setTimeout(()=>{
      void putDraft(viewer.id,vaultKey,{form,saved:savedRef.current,updatedAt:new Date().toISOString()}).then(()=>{
        if(String(form.applicant.name??"").trim()&&/^[0-9]{16}$/.test(String(form.applicant.nik??""))&&(form.source!=="bypass"||form.bypassReason.trim().length>=5)){
          void persist(form).catch(e=>{setSaveState("local");if(e instanceof RequestError&&e.status===409)setError(e.message);});
        }else setSaveState("local");
      }).catch(()=>{setError("Draft lokal belum tersimpan. Periksa ruang perangkat dan gunakan Simpan Draft ke server.");});
    },1000);
    return()=>clearTimeout(timer);
  },[form,loaded,result,viewer.id,vaultKey,persist]);
  useEffect(()=>{
    const nik=String(form.applicant.nik??"");if(!/^[0-9]{16}$/.test(nik))return;
    const controller=new AbortController(),timer=setTimeout(()=>{void request<{count:number}>("duplicate-check",{method:"POST",signal:controller.signal,body:JSON.stringify({nik})}).then(value=>setDuplicate(Math.max(0,value.count-(initial?1:0)))).catch(()=>undefined);},500);
    return()=>{clearTimeout(timer);controller.abort();};
  },[form.applicant.nik,initial]);
  const onPhotosReady=useCallback((ready:boolean,missing:string[])=>{setPhotoReady(ready);setMissingPhotos(missing);},[]);
  const update=(key:keyof IntakeState,value:IntakeState[keyof IntakeState])=>setForm(v=>({...v,[key]:value}));
  const setValues=(group:"applicant"|"reporter")=>(key:string,value:string|number|boolean)=>setForm(v=>({...v,[group]:{...v[group],[key]:value}}));
  const fields=applicantFields.map(f=>f.key==="housing"?{...f,options:viewer.settings.housing}:f);
  async function saveDraft(){
    setBusy(true);setError("");
    try{
      await putDraft(viewer.id,vaultKey,{form,saved:savedRef.current,updatedAt:new Date().toISOString()});
      if(form.applicant.name&&/^[0-9]{16}$/.test(String(form.applicant.nik??""))){await persist(form);setToast("Draft tersimpan. Anda bisa tetap mengisi atau melanjutkannya nanti.");}
      else{setSaveState("local");setToast("Draft disimpan pada perangkat. Lengkapi nama dan NIK agar tersimpan ke server.");}
    }catch(e){setError(e instanceof Error?e.message:"Draft belum tersimpan.");}finally{setBusy(false);}
  }
  function validateStep(step:number):boolean{
    let current:Record<string,string[]>={};
    if(step===0){current=validateFields(fields.slice(0,12),form.applicant);if(!form.region.trim())current.region=["Wilayah penugasan wajib diisi."];if(form.source==="bypass"&&form.bypassReason.trim().length<5)current.bypassReason=["Alasan langsung minimal 5 karakter."];}
    if(step===1)current=validateFields(fields.slice(12),form.applicant);
    if(step===2)current=validateFields(reporterFields,form.reporter);
    setErrors(current);if(Object.keys(current).length){setError("Periksa kolom yang ditandai sebelum melanjutkan.");return false;}return true;
  }
  async function next(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");
    if(!validateStep(form.step))return;
    if(form.step===3&&!photoReady){setError("Foto belum lengkap atau masih mengunggah: "+missingPhotos.join(", "));return;}
    if(form.step<4){
      if(form.step===2){setBusy(true);try{await persist(form);}catch(e){setError(e instanceof Error?e.message:"Draft belum tersimpan.");setBusy(false);return;}setBusy(false);}
      update("step",form.step+1);window.scrollTo({top:0,behavior:"smooth"});return;
    }
    setBusy(true);
    try{
      for(let step=0;step<3;step++)if(!validateStep(step)){update("step",step);return;}
      if(!photoReady)throw new Error("Tunggu sampai seluruh foto wajib berhasil tersimpan.");
      const row=await persist(form,true),submitted=row.status==="screening"?row:await request<AidApplication>(`applications/${row.id}/actions/submit`,{method:"POST",body:JSON.stringify({version:row.version})});
      savedRef.current=submitted;await removeDraft(viewer.id,vaultKey);setResult(submitted);window.scrollTo({top:0,behavior:"smooth"});
    }catch(e){if(e instanceof RequestError)setErrors(e.fields);setError(e instanceof Error?e.message:"Pengajuan belum berhasil dikirim. Isian tetap tersimpan.");}
    finally{setBusy(false);}
  }
  const closeToast=useCallback(()=>setToast(""),[]);
  if(result){const step=nextStep(result.status,result.source);return <div className={s.successPage}><span className={s.successMark}><CheckCircle2 size={42}/></span><p className={s.eyebrow}>PENGAJUAN BERHASIL DIKIRIM</p><h1>{String(form.applicant.name)}</h1><p>Nomor pengajuan <strong>{result.number}</strong>. Data dan dokumen sudah tersimpan.</p><Card title={step.title} description={step.description}><div className={s.ownerRow}><span>Penanggung jawab berikutnya</span><strong>{step.owner}</strong></div></Card><div className={s.actions}><Link className={s.button} href={href("pengajuan/"+result.id)}>Lihat pengajuan</Link><Link className={`${s.button} ${s.secondary}`} href={href(homeByRole[viewer.role])}>Kembali ke antrean saya</Link></div><button className={s.textButton} onClick={()=>window.location.assign(href("pengajuan/"+(direct?"langsung":"baru")))}>Buat pengajuan lain</button></div>;}
  return <>
    <div className={s.heading}><div><Link className={s.backLink} href={href(homeByRole[viewer.role])}><ChevronLeft size={15}/>Kembali ke antrean</Link><h1>{initial?"Lengkapi pengajuan":direct?"Ajukan langsung":"Pengajuan bantuan baru"}</h1><p>Isi bertahap. Draft dan foto tidak hilang saat Anda berpindah langkah.</p></div><span className={s.draftIndicator}>{saveState==="saving"?<LoaderCircle className={s.spin} size={15}/>:<CloudCheck size={16}/>} {saveState==="saving"?"Menyimpan…":saveState==="saved"?"Draft tersimpan":"Draft pada perangkat"}</span></div>
    {error&&<div className={`${s.notice} ${s.error}`} role="alert">{error}</div>}
    {olderDraft&&<div className={s.notice}><span>Ada draft lokal lebih lama. Data server terbaru tetap digunakan.</span><button className={s.textButton} onClick={()=>{setForm(olderDraft.form);setOlderDraft(null);}}>Pulihkan isian lokal</button></div>}
    {duplicate!==null&&duplicate>0&&<div className={s.notice}>NIK ini tercatat pada {duplicate} pengajuan lain. Ini peringatan, bukan penolakan otomatis.</div>}
    <div className={s.wizardLayout}><aside className={s.wizardSteps}><p className={s.eyebrow}>LANGKAH PENGAJUAN</p>{labels.map((label,i)=><button key={label} type="button" disabled={i>form.step} onClick={()=>update("step",i)} data-active={i===form.step}><span>{i<form.step?"✓":i+1}</span><div><strong>{label}</strong><small>{i===form.step?"Sedang diisi":i<form.step?"Sudah dilewati":"Belum diisi"}</small></div></button>)}<p className={s.privacyNote}>Data dan dokumen hanya dapat dilihat petugas berwenang.</p></aside>
    <form onSubmit={next} noValidate ref={formRef} className={s.wizardForm}>
      <div className={s.mobileProgress}><span>Langkah {form.step+1} dari 5</span><strong>{labels[form.step]}</strong><div><span style={{width:((form.step+1)/5*100)+"%"}}/></div></div>
      <div className={s.card}><div className={s.cardHeader}><div><h2>{labels[form.step]}</h2><p>{["Data identitas dan alamat calon penerima.","Ceritakan kondisi dan bantuan yang dibutuhkan.","Orang yang melaporkan atau merekomendasikan pemohon.","Unggah foto wajah dan KTP yang jelas.","Pastikan seluruh informasi sudah sesuai sebelum dikirim."][form.step]}</p></div><span className={s.stepCount}>{String(form.step+1).padStart(2,"0")} / 05</span></div><div className={s.cardBody}>
      {form.step===0&&<><div className={s.formGrid}>
        <label className={s.field}><span>Sumber pengajuan <em>*</em></span><select className={s.input} value={form.source} disabled={!!initial||direct} onChange={e=>update("source",e.target.value)}>{viewer.role!=="verifier"&&<><option value="online">Online / WhatsApp</option><option value="walk_in">Walk-in / datang langsung</option></>}{(viewer.canBypass||initial?.source==="bypass")&&<option value="bypass">Ajukan langsung</option>}</select></label>
        <label className={s.field}><span>Program bantuan <em>*</em></span><select className={s.input} value={form.program} onChange={e=>update("program",e.target.value)}>{viewer.settings.programs.map(p=><option key={p}>{p}</option>)}</select></label>
        <label className={`${s.field} ${s.wide}`}><span>Wilayah penugasan <em>*</em></span><input className={s.input} value={form.region} list="aid-regions" onChange={e=>update("region",e.target.value)} aria-invalid={!!errors.region}/><datalist id="aid-regions">{viewer.settings.regions.map(r=><option key={r}>{r}</option>)}</datalist>{errors.region&&<small className={s.fieldError}>{errors.region[0]}</small>}</label>
        {form.source==="bypass"&&<label className={`${s.field} ${s.wide}`}><span>Alasan pengajuan langsung <em>*</em></span><textarea className={s.input} value={form.bypassReason} onChange={e=>update("bypassReason",e.target.value)} aria-invalid={!!errors.bypassReason}/>{errors.bypassReason&&<small className={s.fieldError}>{errors.bypassReason[0]}</small>}</label>}
      </div><div className={s.sectionDivider}/><Fields fields={fields.slice(0,12)} values={form.applicant} set={setValues("applicant")} prefix="applicant." errors={errors}/></>}
      {form.step===1&&<Fields fields={fields.slice(12)} values={form.applicant} set={setValues("applicant")} prefix="applicant." errors={errors}/>}
      {form.step===2&&<Fields fields={reporterFields} values={form.reporter} set={setValues("reporter")} prefix="reporter." errors={errors}/>}
      <div hidden={form.step!==3}>{saved?<PhotoSlots owner={viewer.id} applicationId={saved.id} documents={documents} requirements={intakePhotos} onReady={onPhotosReady} onUploaded={refreshDocuments}/>:<p>Lengkapi nama dan NIK lalu lanjutkan agar foto terhubung ke draft Anda.</p>}</div>
      {form.step===4&&<div className={s.reviewPage}><div className={s.reviewNotice}><CheckCircle2 size={22}/><span>Periksa sekali lagi. Setelah dikirim, pengajuan masuk ke {form.source==="bypass"?"antrean keputusan langsung":"antrean screening"}.</span></div>{[
        ["Data pemohon",[["Nama",form.applicant.name],["NIK",form.applicant.nik],["Alamat",[form.applicant.street,form.applicant.village,form.applicant.district,form.applicant.city].filter(Boolean).join(", ")],["Program",form.program]]],
        ["Kondisi & kebutuhan",[["Pekerjaan",form.applicant.job],["Penghasilan","Rp "+Number(form.applicant.income??0).toLocaleString("id-ID")+" / "+form.applicant.incomePeriod],["Tanggungan",form.applicant.dependentCount],["Masalah",form.applicant.problem]]],
        ["Data pelapor",[["Nama pelapor",form.reporter.name],["Telepon",form.reporter.phone],["Tanggal laporan",form.reporter.date]]],
      ].map(([title,rows],i)=><section className={s.reviewBlock} key={String(title)}><div><h3>{String(title)}</h3><button type="button" className={s.textButton} onClick={()=>update("step",i)}>Ubah</button></div><dl>{(rows as unknown as [string,unknown][]).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{String(value??"—")}</dd></div>)}</dl></section>)}<section className={s.reviewBlock}><div><h3>Foto & dokumen</h3><button type="button" className={s.textButton} onClick={()=>update("step",3)}>Periksa foto</button></div><p>{photoReady?"✓ Foto wajah dan KTP sudah tersimpan.":"Foto belum lengkap atau masih mengunggah."}</p></section></div>}
      </div></div>
      <div className={s.formFooter}><Button variant="secondary" type="button" disabled={busy} onClick={()=>void saveDraft()}><Save size={16}/>Simpan draft</Button><div className={s.actions}>{form.step>0&&<Button variant="ghost" type="button" disabled={busy} onClick={()=>update("step",form.step-1)}><ChevronLeft size={16}/>Kembali</Button>}<Button disabled={busy||!loaded||form.step>=3&&!photoReady}>{busy?<LoaderCircle className={s.spin} size={16}/>:null}{busy?"Menyimpan…":form.step===4?"Kirim pengajuan":form.step===3?"Periksa pengajuan":"Lanjut"}{!busy&&<ChevronRight size={16}/>}</Button></div></div>
    </form></div>{toast&&<Toast message={toast} onClose={closeToast}/>}
  </>;
}

