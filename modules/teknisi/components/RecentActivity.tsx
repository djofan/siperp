import Link from "next/link";
import { dateTime } from "../api/queries";
import { isStatus,statuses } from "../api/policy";
import styles from "./RecentActivity.module.css";

type Activity={id:string;status:string;note:string;actorName:string;createdAt:Date;ticket:{id:string;number:string;device:string}};
function activityLabel(event:Activity){
 if(event.note.startsWith("KOREKSI TRANSAKSI"))return "Koreksi transaksi";
 if(event.note==="Data penerimaan diperbarui.")return "Data diperbarui";
 if(event.status==="collected")return "Perangkat diambil";
 if(event.status==="ready")return "Siap diambil";
 if(event.status==="received")return "Servis diterima";
 if(event.status==="approval")return "Menunggu persetujuan";
 if(event.status==="paused")return "Pengerjaan ditunda";
 return isStatus(event.status)?statuses[event.status]:"Perkembangan servis";
}
export function RecentActivity({events,root}:{events:Activity[];root:string}){
 return <section className={`tech-box ${styles.panel}`} aria-label="Aktivitas terbaru">
  <header className={styles.header}><h2>Aktivitas terbaru</h2><span>{events.length} terbaru</span></header>
  {events.length?<ol className={styles.list}>{events.map(event=><li key={event.id}>
   <Link href={`${root}/tiket/${event.ticket.id}`} className={styles.row}>
    <span className={styles.icon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3h8v4H8zM6 5H4v16h16V5h-2M8 12h8M8 16h5"/></svg></span>
    <div className={styles.content}>
     <div className={styles.heading}><strong>{event.ticket.number}</strong><span className={styles.badge}>{activityLabel(event)}</span></div>
     <span className={styles.device}>{event.ticket.device}</span>
     <p className={styles.note}>{event.note.replace(/\s+/g," ").trim()}</p>
     <div className={styles.meta}><span>{event.actorName}</span><time dateTime={event.createdAt.toISOString()}>{dateTime(event.createdAt)}</time></div>
    </div>
    <svg className={styles.arrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
   </Link>
  </li>)}</ol>:<p className={styles.empty}>Aktivitas akan muncul setelah servis pertama diterima.</p>}
 </section>;
}
