"use client";
import {useEffect,useId,useState} from "react";
import type {AidValues} from "@/contracts/modules/bantuan";
import {request} from "../api/client";
import s from "./Workspace.module.css";
type Region={id:string;name:string};
const levels=[{key:"province",label:"Provinsi"},{key:"city",label:"Kabupaten / kota"},{key:"district",label:"Kecamatan"},{key:"village",label:"Desa / kelurahan"}];
function RegionSelect({level,index,values,change}:{level:typeof levels[number];index:number;values:AidValues;change:(key:string,value:string)=>void}){
 const listId=useId();
 const [result,setResult]=useState<{key:string;rows:Region[];error:boolean}|null>(null);
 const parent=index?String(values[levels[index-1].key+"Id"]??""):"";
 const key=level.key+":"+parent,loading=(!index||!!parent)&&result?.key!==key,rows=result?.key===key?result.rows:[],error=result?.key===key&&result.error;
 useEffect(()=>{const controller=new AbortController();if(index&&!parent)return;
 request<Region[]>(`regions/${level.key}?parent=${parent}`,{signal:controller.signal}).then(rows=>{if(!controller.signal.aborted)setResult({key,rows,error:false});}).catch(()=>{if(!controller.signal.aborted)setResult({key,rows:[],error:true});});return()=>controller.abort();},[index,parent,level.key,key]);
 const name=String(values[level.key]??"");
 return <label className={s.field}><span>{level.label} <small>Opsional</small></span><input className={s.input} list={listId} value={name} disabled={loading} placeholder={loading?"Memuat wilayah…":"Ketik atau pilih "+level.label.toLowerCase()} onChange={e=>{const selected=rows.find(r=>r.name.toLocaleLowerCase("id-ID")===e.target.value.toLocaleLowerCase("id-ID"));change(level.key+"Id",selected?.id??"");change(level.key,selected?.name??e.target.value);for(const child of levels.slice(index+1)){change(child.key,"");change(child.key+"Id","");}}}/><datalist id={listId}>{rows.map(r=><option key={r.id} value={r.name}/>)}</datalist>{error&&<small role="status">Pilihan belum tersedia. Anda tetap dapat melanjutkan menggunakan alamat lengkap.</small>}</label>;
}
export function AddressRegions({values,set}:{values:AidValues;set:(key:string,value:AidValues[string])=>void}){return <div className={s.formGrid}>{levels.map((level,index)=><RegionSelect key={level.key} level={level} index={index} values={values} change={set}/>)}</div>;}
