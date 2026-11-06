import Link from "next/link";
import { apiRequest, ApiError } from "@/lib/api";
import { ReportExport } from "./ReportExport";
import { engagement, type LearningModule, type ReportResponse } from "./types";
import s from "./Reports.module.css";

type Params=Record<string,string|string[]|undefined>;
const keys=["from","to","q","group","teacher","type","active","engagement","min_score","sort","page"];
function queryOf(params:Params){const query=new URLSearchParams();for(const key of keys){const value=params[key];if(typeof value==="string"&&value)query.set(key,value);}return query;}
export function ReportStats({data}:{data:ReportResponse["summary"]}){return <div className={s.stats}>{[
  ["Peserta sesuai filter",data.participants],["Tugas selesai",`${data.approved}/${data.assigned}`],["Menunggu koreksi",data.pending],["Belum dikumpulkan · lewat tenggat",data.overdue],["Pengumpulan terlambat",data.late],["Rata-rata nilai kuis",data.score===null?"—":Number(data.score).toFixed(1)],
].map(([label,value])=><div className={s.stat} key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>;}

export async function ReportPage({module,base,params={}}:{module:LearningModule;base:string;params?:Params}){
  const query=queryOf(params);let report:ReportResponse;
  try{report=await apiRequest<ReportResponse>(`${module}/reports/participants?${query}`,{},false);}catch(e){if(e instanceof ApiError&&e.status===422)return <section className={s.report}><h2>Filter laporan belum valid</h2><p>Periksa tanggal awal/akhir dan nilai minimum (0–100).</p><Link href={base} className={s.button}>Reset filter</Link></section>;throw e;}
  const value=(key:string)=>query.get(key)??"";
  const pageLink=(page:number)=>{const next=new URLSearchParams(query);next.set("page",String(page));return `${base}?${next}`;};
  return <section className={s.report}>
    <div className={s.heading}><div><h2>Laporan peserta</h2><p>Keaktifan, hasil kuis, dan progres per individu · {module==="tanwir"?"Tanwir Qurani":"Ojol Mengaji"}</p></div><ReportExport module={module} query={query.toString()}/></div>
    <form className={s.filter} action={base}>
      <label>Cari peserta<input name="q" defaultValue={value("q")} placeholder="Nama atau kode akun" maxLength={200}/></label>
      <label>Tugas dibuat dari<input type="date" name="from" defaultValue={value("from")}/></label><label>Sampai tanggal<input type="date" name="to" defaultValue={value("to")}/></label>
      <label>Kelompok<select name="group" defaultValue={value("group")}><option value="">Semua kelompok</option>{report.groups.map(g=><option key={g.id} value={g.id}>{g.code} · {g.name}</option>)}</select></label>
      {report.scope==="admin"&&<label>Guru / pemeriksa<select name="teacher" defaultValue={value("teacher")}><option value="">Semua guru</option>{report.teachers.map(t=><option key={t.id} value={t.id}>{t.name} · {t.code}</option>)}</select></label>}
      <label>Jenis tugas<select name="type" defaultValue={value("type")}><option value="">Semua jenis</option><option value="voice_note">Suara</option><option value="video">Video</option><option value="quiz">Kuis</option></select></label>
      <label>Status akun<select name="active" defaultValue={value("active")}><option value="">Aktif & nonaktif</option><option value="1">Aktif</option><option value="0">Nonaktif</option></select></label>
      <label>Keaktifan<select name="engagement" defaultValue={value("engagement")}><option value="">Semua keaktifan</option><option value="consistent">Konsisten (≥80% tepat waktu)</option><option value="attention">Perlu perhatian (&lt;80%)</option><option value="none">Belum mengumpulkan</option></select></label>
      <label>Rata-rata kuis minimal<input type="number" name="min_score" min={0} max={100} step="any" defaultValue={value("min_score")} placeholder="0–100"/></label>
      <label>Urutkan<select name="sort" defaultValue={value("sort")||"-completion"}><option value="-completion">Penyelesaian tertinggi</option><option value="-score">Nilai tertinggi</option><option value="-missing">Paling perlu tindak lanjut</option><option value="name">Nama A–Z</option></select></label>
      <div className={s.actions}><button className={s.button}>Terapkan filter</button><Link href={base}>Reset filter</Link></div>
    </form>
    <ReportStats data={report.summary}/>
    <p className={s.note}>Periode berdasarkan tanggal pembuatan tugas (WIB), dengan hasil terkini dan kelompok peserta saat ini. Konsisten berarti ≥80% tugas dikumpulkan tepat waktu, bukan penilaian kemampuan mengaji. Tugas yang masih terbuka termasuk dalam pembanding; nilai kosong berarti belum ada kuis. PIC Tanwir melihat kelompok bimbingannya dan tugas terkait; guru Ojol melihat tugas buatannya atau yang menunjuknya sebagai co-reviewer.</p>
    <div className={s.tableWrap}><table className={s.table}><caption className="sr-only">Performa individu peserta sesuai filter</caption><thead><tr>{["Peserta","Kelompok","Keaktifan","Tugas","Dikumpulkan","Selesai","Progres","Menunggu","Ulang","Belum masuk","Lewat tenggat","Tepat waktu","Terlambat","Kuis / nilai","Percobaan","Terakhir mengumpulkan"].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{report.data.map(r=><tr key={r.id}><td><strong>{r.name}</strong><small>{r.code} · {Number(r.active)?"Aktif":"Nonaktif"}</small></td><td>{r.group_name??"Belum ada kelompok"}</td><td><span className={s.pill}>{engagement(r)}</span></td><td>{r.assigned}</td><td>{r.submitted}</td><td>{r.approved}</td><td>{r.completion===null?"—":`${r.completion}%`}<span className={s.progress}><span style={{width:`${r.completion??0}%`}}/></span></td><td>{r.pending}</td><td>{r.rejected}</td><td>{r.missing}</td><td>{r.overdue}</td><td>{r.on_time}</td><td>{r.late}</td><td>{r.quizzes} kuis / {r.score===null?"—":Number(r.score).toFixed(1)}</td><td>{r.attempts}</td><td>{r.last_submission?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeZone:"Asia/Jakarta"}).format(new Date(r.last_submission.replace(" ","T")+"Z")):"Belum pernah"}</td></tr>)}{!report.data.length&&<tr><td colSpan={16}>Tidak ada peserta yang sesuai filter. Coba ubah periode atau kelompok.</td></tr>}</tbody></table></div>
    <div className={s.footer}><span>{report.meta.total} peserta · halaman {report.meta.current_page} dari {report.meta.last_page}</span><div className={s.actions}>{report.meta.current_page>1&&<Link href={pageLink(report.meta.current_page-1)}>← Sebelumnya</Link>}{report.meta.current_page<report.meta.last_page&&<Link href={pageLink(report.meta.current_page+1)}>Berikutnya →</Link>}</div></div>
  </section>;
}

export async function LearningDashboardReport({module,from,to}:{module:LearningModule;from?:string;to?:string}){
  const query=new URLSearchParams({per_page:"1"});if(from)query.set("from",from);if(to)query.set("to",to);
  let data:ReportResponse|null=null;
  try{data=await apiRequest<ReportResponse>(`${module}/reports/participants?${query}`,{},false);
  }catch(e){if(!(e instanceof ApiError))throw e;}
  if(!data)return <section className={s.dashboard}><p>Ringkasan {module} belum dapat dimuat. <Link href={`/admin/${module}/laporan`}>Buka laporan</Link></p></section>;
    return <section className={s.dashboard}><div className={s.compact}><div className={s.heading}><div><h2>{module==="tanwir"?"Tanwir Qurani":"Ojol Mengaji"} · performa peserta</h2><p>Ringkasan sesuai periode tugas. Buka laporan untuk filter kelompok, guru, keaktifan, dan nilai.</p></div><Link className={s.button} href={`/admin/${module}/laporan?${query}`}>Lihat laporan & Excel →</Link></div><ReportStats data={data.summary}/></div></section>;

}
