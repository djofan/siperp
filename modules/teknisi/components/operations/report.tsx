import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { TechnicianUser } from "../../api/access";
import { ticketScope,outletScope } from "../../api/policy";
import { operationalRoot } from "../../api/navigation";
import { currency,dateTime } from "../../api/queries";
import { PrintButton } from "../PrintButton";

export async function ReportView({user,searchParams}:{user:TechnicianUser;searchParams:Promise<{month?:string;outlet?:string}>}){
 const filters=await searchParams;
 const dateParts=new Intl.DateTimeFormat("en",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit"}).formatToParts(new Date());
 const fallback=`${dateParts.find(p=>p.type==="year")!.value}-${dateParts.find(p=>p.type==="month")!.value}`;
 const month=/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(filters.month??"")?filters.month!:fallback;
 const [year,m]=month.split("-").map(Number);
 const start=new Date(`${month}-01T00:00:00+07:00`),end=new Date(Date.UTC(year,m,1,-7)),previous=new Date(Date.UTC(year,m-2,1,-7));
 const selected=user.technician?.outletId??filters.outlet;
 const scope={...ticketScope(user),...(selected?{outletId:selected}:{})};
 const [outlets,paid,lastPaid,ready,intake,active]=await Promise.all([
  prisma.teknisiOutlet.findMany({where:outletScope(user),include:{technicians:{where:{isActive:true}}},orderBy:{name:"asc"}}),
  prisma.teknisiTicket.findMany({where:{...scope,paidAt:{gte:start,lt:end}},include:{outlet:true},orderBy:{paidAt:"desc"}}),
  prisma.teknisiTicket.findMany({where:{...scope,paidAt:{gte:previous,lt:start}},select:{outletId:true,paidAmount:true}}),
  prisma.teknisiTicket.findMany({where:{...scope,status:"ready",paidAt:null},select:{serviceCost:true}}),
  prisma.teknisiTicket.findMany({where:{...scope,createdAt:{gte:start,lt:end}},select:{outletId:true,status:true,originalTicketId:true,outcome:true}}),
  prisma.teknisiTicket.findMany({where:{...scope,status:{notIn:["collected","cancelled"]}},select:{outletId:true,status:true,dueAt:true}})
 ]);
 const revenue=paid.reduce((s,t)=>s+t.paidAmount,0),last=lastPaid.reduce((s,t)=>s+t.paidAmount,0);
 const receivable=ready.reduce((s,t)=>s+t.serviceCost,0);
 const durations=paid.filter(t=>t.readyAt&&t.startedAt&&t.outcome==="repaired").map(t=>(t.readyAt!.getTime()-t.startedAt!.getTime())/3600000);
 const average=durations.length?durations.reduce((s,n)=>s+n,0)/durations.length:0;
 const weekAmounts=Array.from({length:5},(_,i)=>paid.filter(t=>Math.floor((Number(new Intl.DateTimeFormat("en",{timeZone:"Asia/Jakarta",day:"numeric"}).format(t.paidAt!))-1)/7)===i).reduce((s,t)=>s+t.paidAmount,0));
 const max=Math.max(...weekAmounts,1),root=operationalRoot(user.role);
 const growth=(now:number,before:number)=>before?`${(((now-before)/before)*100).toFixed(1)}%`:now?"Baru tercatat":"—";
 const metrics=[["Pemasukan diterima",currency(revenue)],["Tagihan Ready belum dibayar",currency(receivable)],["Servis berhasil dibayar",paid.filter(t=>t.outcome==="repaired").length],["Rata-rata pengerjaan",`${average.toFixed(1)} jam`],["Perubahan dari bulan lalu",growth(revenue,last)],["Gagal / batal dengan pembayaran",paid.filter(t=>t.outcome!=="repaired").length]];
 return <>
  <div className="tech-toolbar"><h1>Laporan outlet</h1><PrintButton label="Cetak laporan"/><a href="/api/teknisi/ekspor">Ekspor servis CSV</a></div>
  <form className="tech-toolbar"><input type="month" name="month" aria-label="Bulan laporan" defaultValue={month}/>{user.canManage&&<select name="outlet" aria-label="Outlet laporan" defaultValue={selected}><option value="">Semua outlet</option>{outlets.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>}<button className="tech-btn secondary">Tampilkan</button></form>
  <p className="tech-note">Pemasukan dihitung dari tanggal pembayaran. Tagihan Ready adalah saldo terkini, bukan pemasukan. Nilai ini adalah omzet, bukan laba bersih.</p>
  <div className="tech-summary">{metrics.map(([label,value])=><div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div>
  <section className="tech-box"><h2>Pemasukan per minggu · {month}</h2>{revenue>0?<div className="tech-chart" style={{gridTemplateColumns:"repeat(5,minmax(0,1fr))"}}>{weekAmounts.map((amount,i)=><div key={i}><small>{currency(amount)}</small><i style={{height:`${amount/max*110}px`}}/><span>Minggu {i+1}</span></div>)}</div>:<p>Belum ada pembayaran pada periode ini. Grafik akan muncul dari transaksi asli.</p>}</section>
  <section className="tech-box overflow-x-auto"><h2>Perbandingan outlet</h2><table className="w-full text-left"><thead><tr>{["Outlet / teknisi","Masuk","Selesai dibayar","Pemasukan","vs bulan lalu","Aktif / terlambat","Garansi","Batal"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{outlets.filter(o=>!selected||o.id===selected).map(o=>{
   const settled=paid.filter(t=>t.outletId===o.id),received=intake.filter(t=>t.outletId===o.id),queue=active.filter(t=>t.outletId===o.id),amount=settled.reduce((s,t)=>s+t.paidAmount,0),before=lastPaid.filter(t=>t.outletId===o.id).reduce((s,t)=>s+t.paidAmount,0);
   return <tr key={o.id}><td>{o.name}<p>{o.technicians.map(t=>t.name).join(", ")||"Belum ada teknisi"}</p></td><td>{received.length}</td><td>{settled.filter(t=>t.outcome==="repaired").length}</td><td>{currency(amount)}</td><td>{growth(amount,before)}</td><td>{queue.length} / {queue.filter(t=>t.dueAt&&t.dueAt<new Date()&&t.status!=="ready").length}</td><td>{received.filter(t=>t.originalTicketId).length}</td><td>{received.filter(t=>t.outcome!=="repaired").length}</td></tr>;
  })}</tbody></table></section>
  <section className="tech-box overflow-x-auto"><h2>Transaksi diterima</h2><table className="w-full text-left"><thead><tr>{["Tanggal","Servis / hasil","Outlet","Metode","Diterima"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{paid.map(t=><tr key={t.id}><td>{dateTime(t.paidAt!)}</td><td><Link href={`${root}/tiket/${t.id}`}>{t.number}</Link><p>{t.outcome==="repaired"?"Perbaikan selesai":"Biaya pengecekan / servis gagal"}</p></td><td>{t.outlet.name}</td><td>{t.paymentMethod}</td><td>{currency(t.paidAmount)}</td></tr>)}</tbody></table>{!paid.length&&<p>Belum ada pembayaran pada bulan ini.</p>}</section>
 </>;
}
