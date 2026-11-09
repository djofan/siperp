import type { BantuanViewer } from "@/contracts/modules/bantuan";
import { hasAnyRole } from "../permissions";

export const pwaRoot = "/bantuan-app";
export const pwaHome = `${pwaRoot}/beranda`;
export type PwaTab = "beranda" | "tugas" | "santunan" | "notifikasi" | "akun";
export type TaskKind = "intake" | "assignment" | "survey" | "survey_review" | "approval" | "funding" | "transfer" | "distribution";

const kindsByRole:Record<string,TaskKind[]>={
  admin:["intake","assignment","survey","survey_review","approval","funding","transfer","distribution"],
  requester:["intake"],
  call_center:["intake","assignment","survey_review","distribution"],
  approver:["approval"],
  chair:["approval"],
  verifier:["survey","distribution"],
  fund_requester:["funding","transfer"],
  treasurer:["transfer","distribution"],
};

export function taskKinds(viewer:BantuanViewer):TaskKind[] {
  const roles=[viewer.role,...(viewer.roles??[])];
  return [...new Set(roles.flatMap(role=>kindsByRole[role]??[]))];
}
export function pwaAccess(viewer: BantuanViewer) {
  return {
    tasks: taskKinds(viewer).length>0,
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
export const taskLabels:Record<TaskKind,string>={
  intake:"Review pengajuan",assignment:"Penugasan",survey:"Survei saya",survey_review:"Review survei",
  approval:"Persetujuan",funding:"Pengajuan dana",transfer:"Pencairan",distribution:"Penyaluran",
};
export const taskStates:Record<TaskKind,string[]>={
  intake:["draft","needs_data","screening"],
  assignment:["survey_assignment","approved"],
  survey:["survey_assigned"],
  survey_review:["survey_cc_review"],
  approval:["review1","survey_submitted","review2","bypass_review"],
  funding:["fund_ready","fund_submitted"],
  transfer:["fund_approved"],
  distribution:["disbursed","delivery_failed"],
};
export function taskQuery(viewer:BantuanViewer,kind:TaskKind,page:number,search:string) {
  const query=new URLSearchParams({perPage:"12",page:String(page),sort:"updated"});
  if(search.trim())query.set("search",search.trim());
  query.set("states",taskStates[kind].join(","));
  if(kind==="survey"&&!hasAnyRole(viewer,["admin","call_center"]))query.set("verifierId","me");
  if(kind==="distribution") {
    if(!hasAnyRole(viewer,["admin","call_center","treasurer"]))query.set("distributorId","me");
  }
  return query.toString();
}
