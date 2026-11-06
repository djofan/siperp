import { TrackingPopup } from "../components/TrackingPopup";
import { apiRequest, ApiError } from "@/lib/api";
import type { Response7 } from "@/modules/teknisi/api/contracts";
import { connection } from "next/server";
import styles from "./landing.module.css";

const steps=[
  ["01","Titipkan perangkat","Datang ke outlet. Keluhan, kondisi HP, dan estimasi biaya dicatat saat penerimaan."],
  ["02","Teknisi mulai bekerja","Perangkat ditangani oleh teknisi outlet. Hasil pemeriksaan dan tindakan tercatat."],
  ["03","Pantau perkembangan","Gunakan kode pelacakan dari outlet untuk melihat status dan riwayat servis."],
  ["04","Ambil kembali HP","Saat siap diambil, selesaikan pembayaran dan terima kembali perangkat di outlet."],
];
function PhoneIcon(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/></svg>;}
export default async function Page(){
  await connection();
  let outlets:Response7["outlets"]=[];
  try{outlets=await apiRequest<Response7["outlets"]>("teknisi/public/outlets");}
  catch(error){if(!(error instanceof ApiError&&error.status===403))throw error;}
  const technicians=outlets.flatMap(outlet=>(outlet.technicians??[]).map(technician=>({...technician,outletName:outlet.name})));
  return <div className={styles.landing} data-teknisi-landing>
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}><span className={styles.badge}>TEKNISI HP / LAYANAN PERBAIKAN</span><h1>HP bermasalah?<br/>Kami bantu <em>tangani.</em></h1><p>Temukan outlet dan teknisi untuk perangkat Anda. Dari penerimaan hingga siap diambil, perkembangan servis bisa dipantau dalam satu tempat.</p><div className={styles.heroActions}><TrackingPopup className={styles.primary}>Cek progres servis <span aria-hidden="true">→</span></TrackingPopup><a className={styles.secondary} href="#outlet">Cari outlet terdekat <span aria-hidden="true">↗</span></a></div><div className={styles.heroFacts}><span><strong>{outlets.length}</strong> outlet layanan</span><span><strong>{technicians.length}</strong> teknisi aktif</span></div></div>
        <aside className={styles.utility} aria-label="Alur penanganan perangkat"><div className={styles.utilityTitle}><span className={styles.phoneIcon}><PhoneIcon/></span><div><small>PERBAIKAN YANG TERDOKUMENTASI</small><h2>Jelas di setiap tahap.</h2></div></div><div className={styles.servicePath}>{[["01","Diterima","Keluhan & kondisi awal dicatat"],["02","Dikerjakan","Ditangani oleh teknisi outlet"],["03","Siap diambil","Hasil perbaikan telah dicatat"],["04","Selesai","Pembayaran & serah terima"]].map(([number,title,body])=><div key={number}><span>{number}</span><div><strong>{title}</strong><p>{body}</p></div><span aria-hidden="true">{number==="04"?"✓":"↗"}</span></div>)}</div><div className={styles.utilityBottom}><span>Sudah menitipkan perangkat?</span><TrackingPopup className={styles.inlineTrack}>Lacak sekarang <span aria-hidden="true">→</span></TrackingPopup></div></aside>
      </div>
    </section>
    <section className={styles.benefits} aria-label="Informasi layanan"><div className={styles.container}><article><span>01</span><div><h2>Keluhan terdokumentasi</h2><p>Kondisi awal dan kebutuhan servis dicatat.</p></div></article><article><span>02</span><div><h2>Proses lebih transparan</h2><p>Status pengerjaan dapat Anda pantau.</p></div></article><article><span>03</span><div><h2>Terhubung dengan outlet</h2><p>Lokasi, kontak, dan teknisi mudah ditemukan.</p></div></article></div></section>
    <section id="proses" className={styles.section}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>ALUR LAYANAN</p><h2>Langkah sederhana.<br/>Informasi yang jelas.</h2></div><p>Dari penerimaan sampai serah terima, setiap tahap membantu Anda memahami perkembangan perangkat.</p></div>
      <ol className={styles.steps}>{steps.map(([number,title,description])=><li key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
    </section>
    <div className={styles.directory}><div className={styles.directoryInner}>
      <section id="outlet" className={styles.section}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>OUTLET LAYANAN</p><h2>Mulai dari outlet terdekat.</h2></div><span className={styles.count}>{outlets.length} outlet tersedia</span></div><div className={styles.outletGrid}>{outlets.map(outlet=><article key={outlet.id} className={styles.outletCard}><div className={styles.outletTitle}><span className={styles.locationIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><div><small>OUTLET TEKNISI HP</small><h3>{outlet.name}</h3></div></div><p>{outlet.address||"Alamat belum tersedia."}</p><div className={styles.outletContact}><span>Kontak outlet</span><strong>{outlet.phone||"Belum tersedia"}</strong></div><span className={styles.teamCount}>{outlet.technicians?.length??0} teknisi aktif di outlet ini</span></article>)}</div>{!outlets.length&&<div className={styles.empty}>Informasi outlet akan ditampilkan setelah tersedia.</div>}</section>
      <section id="teknisi" className={styles.section}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>TIM TEKNISI</p><h2>Kenali yang menangani perangkat Anda.</h2></div><p>Teknisi aktif beserta outlet penempatannya.</p></div><div className={styles.teamGrid}>{technicians.map(technician=><article key={technician.id} className={styles.teamCard}><span className={styles.avatar} aria-hidden="true">{technician.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}</span><div><h3>{technician.name}</h3><p>{technician.outletName}</p>{technician.specialty&&<small>{technician.specialty}</small>}</div></article>)}</div>{!technicians.length&&<div className={styles.empty}>Profil teknisi aktif akan ditampilkan di sini.</div>}</section>
    </div></div>
    <section className={styles.section}><div className={styles.tracking}><div><p className={styles.eyebrow}>KABAR PERANGKAT ANDA</p><h2>Tak perlu menebak.<br/>Cek progresnya sekarang.</h2><p>Status terbaru dan riwayat servis, tanpa perlu login.</p></div><TrackingPopup className={styles.primary}>Cek status servis <span aria-hidden="true">→</span></TrackingPopup></div></section>
  </div>;
}
