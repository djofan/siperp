import type { BantuanViewer } from "@/contracts/modules/bantuan";
import { bantuanStatuses } from "@/contracts/modules/bantuan";
import { defaultListStates, processInfo } from "./policy";

export const sourceLabels:Record<string,string>={online:"Online / WhatsApp",walk_in:"Datang ke kantor",bypass:"Pengajuan langsung"};
export const dateLabels:Record<string,string>={created:"Tanggal pengajuan",updated:"Terakhir diperbarui",disbursed:"Tanggal pencairan",completed:"Tanggal selesai"};
export const sortLabels:Record<string,string>={newest:"Pengajuan terbaru",oldest:"Pengajuan terlama",updated:"Baru diperbarui",amount_high:"Nominal terbesar",amount_low:"Nominal terkecil",name:"Nama A–Z"};
export const defaultFilters={search:"",status:"",program:"",source:"",region:"",from:"",to:"",dateField:"created",verifierId:"",distributorId:"",createdBy:"",amountMin:"",amountMax:"",amountState:"",distributionType:"",overdue:"",sort:"newest",perPage:"12"};
export type ListFilters=typeof defaultFilters;
export type FilterKey=keyof ListFilters;
export const advancedKeys:FilterKey[]=["source","region","from","to","dateField","verifierId","distributorId","createdBy","amountMin","amountMax","amountState","distributionType","overdue"];

export function validateFilters(filters:ListFilters):string {
  if(filters.from&&filters.to&&filters.from>filters.to)return "Tanggal akhir harus sama dengan atau setelah tanggal awal.";
  for(const key of ["amountMin","amountMax"] as const){
    if(filters[key]&&(!/^\d+$/.test(filters[key])||Number(filters[key])>999999999999))return "Nominal harus berupa rupiah bulat antara 0 dan 999.999.999.999.";
  }
  if(filters.amountMin&&filters.amountMax&&Number(filters.amountMin)>Number(filters.amountMax))return "Nominal maksimum harus sama dengan atau lebih besar dari nominal minimum.";
  if(filters.amountState==="unset"&&(filters.amountMin||filters.amountMax))return "Kosongkan rentang nominal jika mencari bantuan yang nominalnya belum ditetapkan.";
  return "";
}

export function applicationParams(viewer:Pick<BantuanViewer,"role">,tab:string,filters:ListFilters,page=1):URLSearchParams {
  const params=new URLSearchParams({page:String(page)});
  for(const [key,value] of Object.entries(filters))if(value.trim())params.set(key,value.trim());
  const states=defaultListStates(viewer,tab);if(states.length)params.set("states",states.join(","));
  const task=processInfo(tab)?.task;if(viewer.role==="verifier"&&task)params.set("task",task);
  return params;
}

export function activeFilterChips(filters:ListFilters,names:Record<string,string>={}):{key:FilterKey;label:string}[]{
  const date=(value:string)=>value.split("-").reverse().join("/");
  const amount=(value:string)=>"Rp"+Number(value).toLocaleString("id-ID");
  const person=(value:string)=>value==="me"?"Saya":value==="unassigned"?"Belum ditugaskan":names[value]??"Petugas dipilih";
  const labels:Partial<Record<FilterKey,string>>={
    search:filters.search?`Pencarian: ${filters.search}`:"",status:bantuanStatuses[filters.status],program:filters.program,
    source:sourceLabels[filters.source],region:filters.region?`Wilayah: ${filters.region}`:"",
    from:filters.from?`${dateLabels[filters.dateField]} mulai ${date(filters.from)}`:"",to:filters.to?`Sampai ${date(filters.to)}`:"",
    verifierId:filters.verifierId?`Survei: ${person(filters.verifierId)}`:"",distributorId:filters.distributorId?`Penyalur: ${person(filters.distributorId)}`:"",createdBy:filters.createdBy?`Pembuat: ${person(filters.createdBy)}`:"",
    amountMin:filters.amountMin?`Minimal ${amount(filters.amountMin)}`:"",amountMax:filters.amountMax?`Maksimal ${amount(filters.amountMax)}`:"",
    amountState:filters.amountState==="set"?"Nominal sudah ditetapkan":filters.amountState==="unset"?"Nominal belum ditetapkan":"",
    distributionType:filters.distributionType==="direct"?"Bendahara langsung":filters.distributionType==="verifier"?"Melalui verifikator":"",
    overdue:filters.overdue?"Penyerahan melewati batas waktu":"",
  };
  return Object.entries(labels).filter(([,label])=>!!label).map(([key,label])=>({key:key as FilterKey,label:label!}));
}
