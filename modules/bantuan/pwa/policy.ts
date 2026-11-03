import type { BantuanViewer } from "@/contracts/modules/bantuan";
import { hasAnyRole } from "../permissions";

export const pwaRoot = "/bantuan-app";
export const pwaHome = `${pwaRoot}/beranda`;
export type PwaTab = "beranda" | "tugas" | "santunan" | "notifikasi" | "akun";
export function pwaAccess(viewer: BantuanViewer) {
  return {
    tasks: hasAnyRole(viewer,["admin","verifier","treasurer"]),
    survey: hasAnyRole(viewer,["admin","verifier"]),
    transfer: hasAnyRole(viewer,["admin","treasurer"]),
    distribution: hasAnyRole(viewer,["admin","verifier","treasurer"]),
    santunan: hasAnyRole(viewer,["admin","treasurer","volunteer","chair"]),
  };
}
export function pwaTabs(viewer:BantuanViewer): {key:PwaTab;label:string}[] {
  const access=pwaAccess(viewer);
  return [{key:"beranda",label:"Beranda"},...(access.tasks?[{key:"tugas" as const,label:"Tugas"}]:[]),...(access.santunan?[{key:"santunan" as const,label:"Santunan"}]:[]),{key:"notifikasi",label:"Notifikasi"},{key:"akun",label:"Akun"}];
}
export function validPwaRoute(path:string[],viewer:BantuanViewer) {
  if(!path.length)return true;
  if(!pwaTabs(viewer).some(tab=>tab.key===path[0]))return false;
  return path.length===1 || path[0]==="tugas"&&path.length===2&&/^[a-zA-Z0-9_-]{1,80}$/.test(path[1]);
}
export type TaskKind = "survey" | "distribution" | "transfer";
export function taskKinds(viewer:BantuanViewer):TaskKind[] {
  const access=pwaAccess(viewer);
  return [...(access.survey?["survey" as const]:[]),...(access.transfer?["transfer" as const]:[]),...(access.distribution?["distribution" as const]:[])];
}
export const taskLabels:Record<TaskKind,string>={survey:"Survei saya",distribution:"Penyaluran",transfer:"Pencairan"};
export function taskQuery(viewer:BantuanViewer,kind:TaskKind,page:number,search:string) {
  const query=new URLSearchParams({perPage:"12",page:String(page),sort:"updated"});
  if(search.trim())query.set("search",search.trim());
  if(kind==="survey") {query.set("states","survey_assigned");query.set("verifierId","me");}
  if(kind==="transfer")query.set("states","fund_approved");
  if(kind==="distribution") {
    query.set("states","disbursed,delivery_failed");
    if(!pwaAccess(viewer).transfer)query.set("distributorId","me");
  }
  return query.toString();
}
