import "server-only";
import {apiRequest} from "@/lib/api";
export type BackupSummary = {id:string;size:number;createdAt:string;tables?:number;rows?:number;files?:number};
export async function runBackup(command:"create"|"verify"|"list",id?:string):Promise<BackupSummary|BackupSummary[]> {
 const result=await apiRequest<BackupSummary|BackupSummary[]>(command==="verify" ? "super/erp/backups/verify" : "super/erp/backups",{method:command==="list"?"GET":"POST",...(command==="verify"?{body:JSON.stringify({id})}:{})});
 const normalize=(row:BackupSummary)=>{const date:unknown=row.createdAt;return {...row,createdAt:date instanceof Date ? date.toISOString():row.createdAt};};return Array.isArray(result)?result.map(normalize):normalize(result);
}
