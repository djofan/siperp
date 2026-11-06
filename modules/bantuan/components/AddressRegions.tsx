"use client";
import {useEffect,useState} from "react";
import type {AidValues} from "@/contracts/modules/bantuan";
import {request} from "../api/client";
import s from "./Workspace.module.css";
type Region={id:string;name:string};
const levels=[{key:"province",label:"Provinsi"},{key:"city",label:"Kabupaten / kota"},{key:"district",label:"Kecamatan"},{key:"village",label:"Desa / kelurahan"}];
function RegionSelect({level,index,values,change}:{level:typeof levels[number];index:number;values:AidValues;change:(key:string,value:string)=>void}){
 const [result,setResult]=useState<{key:string;rows:Region[];error:boolean}|null>(null);
 const parent=index?String(values[levels[index-1].key+"Id"]??""):"";
 const key=level.key+":"+parent,loading=(!index||!!parent)&&result?.key!==key,rows=result?.key===key?result.rows:[],error=result?.key===key&&result.error;
 useEffect(()=>{const controller=new AbortController();if(index&&!parent)return;
 request<Region[]>(`regions/${level.key}?parent=${parent}`,{signal:controller.signal}).then(rows=>{if(!controller.signal.aborted)setResult({key,rows,error:false});}).catch(()=>{if(!controller.signal.aborted)setResult({key,rows:[],error:true});});return()=>controller.abort();},[index,parent,level.key,key]);
 const id=String(values[level.key+"Id"]??""),name=String(values[level.key]??"");
 return <label className={s.field}><span>{level.label} <small>Opsional</small></span><select className={s.input} value={id} disabled={!!index&&!parent||loading} onChange={e=>{const selected=rows.find(r=>r.id===e.target.value);change(level.key+"Id",selected?.id??"");change(level.key,selected?.name??"");for(const child of levels.slice(index+1)){change(child.key,"");change(child.key+"Id","");}}}><option value="">{loading?"Memuat wilayah…":name&&!id?name:"Pilih "+level.label.toLowerCase()}</option>{id&&!rows.some(r=>r.id===id)&&<option value={id}>{name}</option>}{rows.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>{error&&<small role="status">Pilihan belum tersedia. Anda tetap dapat melanjutkan menggunakan alamat lengkap.</small>}</label>;
}
export function AddressRegions({values,set}:{values:AidValues;set:(key:string,value:AidValues[string])=>void}){return <div className={s.formGrid}>{levels.map((level,index)=><RegionSelect key={level.key} level={level} index={index} values={values} change={set}/>)}</div>;}
