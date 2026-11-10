import type { AidDetail } from "@/contracts/modules/bantuan";
import { bantuanRoles } from "@/contracts/modules/bantuan";
import s from "./DecisionNotice.module.css";

export function decisionNote(row:Pick<AidDetail,"status"|"events">){
  const actions:Record<string,string[]>={needs_data:["request_data"],rejected_screening:["screen_reject"],rejected_t1:["review1_reject"],rejected_t2:["review_reject"],rejected_bypass:["review_reject"],survey_assigned:["survey_again","survey_return"]};
  return [...row.events].reverse().find(event=>actions[row.status]?.includes(event.action)&&event.to_status===row.status&&event.reason?.trim());
}
export function DecisionNotice({row}:{row:Pick<AidDetail,"status"|"events">}){
  const note=decisionNote(row);if(!note)return null;
  const rejected=row.status.startsWith("rejected");
  return <section className={`${s.notice} ${rejected?s.rejected:""}`} aria-label="Catatan keputusan pengajuan">
    <div className={s.header}><strong>{rejected?"Pengajuan ditolak":"Data perlu dilengkapi"}</strong><span>{note.actorName??"Petugas"} · {bantuanRoles[note.actor_role]??note.actor_role}</span></div>
    <p className={s.reason}>{note.reason}</p>
    <small>{rejected?"Alasan keputusan ditampilkan di sini dan tetap tersimpan dalam riwayat proses.":"Periksa catatan ini, lengkapi bagian yang diminta, lalu kirim kembali sesuai tahap pengajuan."}</small>
  </section>;
}
