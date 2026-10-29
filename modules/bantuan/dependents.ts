import type { AidDependent } from "@/contracts/modules/bantuan";

export const dependentStatuses=["Belum sekolah","Sekolah","Kuliah","Bekerja","Belum bekerja","Tidak bekerja","Lainnya"];
export function readDependents(value:unknown):AidDependent[]{
  if(Array.isArray(value))return value.map(row=>({name:String(row?.name??""),relationship:String(row?.relationship??""),gender:String(row?.gender??""),age:row?.age===""||row?.age==null?"":Number(row.age),status:String(row?.status??"")}));
  // Keep old free-text entries intact; users can complete them using the new fields.
  return typeof value==="string"?value.split("\n").filter(line=>line.trim()).map(line=>({name:line,relationship:"",gender:"",age:"",status:""})):[];
}
export function dependentErrors(value:unknown):Record<string,string[]>{
  if(!Array.isArray(value))return {};
  const errors:Record<string,string[]>={};
  if(value.length>100)errors.dependents=["Maksimal 100 tanggungan."];
  value.forEach((row,i)=>{
    for(const key of ["name","relationship","status"] as const)if(!String(row[key]??"").trim())errors[`dependents.${i}.${key}`]=["Wajib diisi."];
    if(row.age===""||row.age==null||!Number.isInteger(Number(row.age))||Number(row.age)<0||Number(row.age)>120)errors[`dependents.${i}.age`]=["Isi umur 0–120 tahun."];
    if(row.status&&!dependentStatuses.includes(row.status))errors[`dependents.${i}.status`]=["Pilih status yang tersedia."];
    if(!["laki_laki","perempuan"].includes(row.gender))errors[`dependents.${i}.gender`]=["Pilih jenis kelamin."];
  });
  if(Object.keys(errors).length&&!errors.dependents)errors.dependents=["Lengkapi nama, hubungan, jenis kelamin, umur, dan status setiap tanggungan."];
  return errors;
}
