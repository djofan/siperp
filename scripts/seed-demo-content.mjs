import fs from "node:fs/promises";
import path from "node:path";
import mariadb from "mariadb";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || process.env.NODE_ENV === "production") throw new Error("Data dummy hanya untuk database lokal pengembangan.");
const prefix = "demo-content-v1-";
const id = (kind, i) => prefix + kind + "-" + String(i+1).padStart(2,"0");
const anchor = new Date("2026-10-07T12:00:00+07:00");
const date = days => new Date(anchor.getTime()-days*86400000);
const label = title => "[CONTOH] " + title;
const image = kind => `/demo-content/${kind}.svg`;
const intro = "DATA DUMMY: seluruh kegiatan, lokasi, dan angka dalam konten ini adalah ilustrasi untuk pengujian website, bukan informasi atau realisasi program resmi.";
const body = title => `${intro}\n\n${title}\n\nContoh kegiatan ini menggambarkan persiapan tim, pendataan kebutuhan, koordinasi relawan, dan pelaksanaan kegiatan sosial. Tim menyiapkan perlengkapan serta mendokumentasikan proses kegiatan.\n\nBagian ini dapat digunakan untuk mencoba editor konten, tampilan halaman detail, dan alur publikasi berita. Informasi resmi nantinya perlu diisi berdasarkan dokumentasi yang telah diverifikasi.`;
const datasets = new Map();
function rows(table, values) { datasets.set(table,values); }
const topics = [
  ["Paket Kebutuhan Pokok", "community", "kebutuhan_pokok"],
  ["Dukungan Pendidikan", "education", "pendidikan"],
  ["Layanan Kesehatan", "health", "kesehatan"],
  ["Bantuan Air Bersih", "water", "lainnya"],
  ["Dukungan Keluarga", "volunteers", "lainnya"],
];
const news = ["Relawan Menyiapkan Paket Kepedulian", "Mengenal Program Pendidikan", "Koordinasi Tim Bantuan Lapangan", "Dokumentasi Kegiatan Sosial", "Pendampingan Masyarakat", "Rencana Kegiatan Pekan Depan"];
const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port||3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), timezone: "+00:00" });
const quote = name => "`"+name+"`";
try {
  const existingCodes = new Set((await db.query("SELECT unique_code FROM lazsip_campaigns WHERE id NOT LIKE ?",[prefix+"%"])).map(r => r.unique_code));
  const availableCodes = Array.from({length:100},(_,i)=>String(i).padStart(2,"0")).filter(code=>!existingCodes.has(code));
  const oldCampaigns = new Map((await db.query("SELECT id,unique_code FROM lazsip_campaigns WHERE id LIKE ?",[prefix+"%"])).map(r=>[r.id,r.unique_code]));
  const campaignCodes = [];
  for (let i=0;i<4;i++) {
    const old = oldCampaigns.get(id("lazsip-campaign",i));
    const code = old ?? (process.argv.includes("--clean") ? String(i).padStart(2,"0") : availableCodes.find(c=>!campaignCodes.includes(c)&&![...oldCampaigns.values()].includes(c)));
    if (!code) throw new Error("Kode unik campaign tidak cukup. Tidak ada data yang diubah.");
    campaignCodes.push(code);
  }
  rows("lazsip_campaigns",topics.slice(0,4).map(([title,art],i)=>({id:id("lazsip-campaign",i),title:label(title),description:body(title),target_amount:(i+1)*5000000,current_amount:0,image:image(art),unique_code:campaignCodes[i],is_pinned:i<2,status:"active",created_at:date(i*3)})));
  rows("sip_program_bantuan",topics.map(([title,art],i)=>({id:id("sip-program",i),title:label(title),slug:"contoh-"+title.toLowerCase().replace(/\s+/g,"-"),description:body(title),image:image(art),campaign_url:i<4 ? `/lazsip/donasi/${id("lazsip-campaign",i)}` : "/lazsip/donasi",is_pinned:i<3,created_at:date(i*4)})));
  for (const moduleName of ["sip","lazsip"]) rows(moduleName+"_news",news.map((title,i)=>({id:id(moduleName+"-news",i),title:label(title),content:body(title),image:image(topics[i%topics.length][1]),is_pinned:i<2,status:i===5?"draft":"published",created_at:date(i*3+1)})));
  rows("sip_penyaluran_bantuan",topics.slice(0,4).map(([title,art],i)=>({id:id("sip-penyaluran",i),title:label("Dokumentasi "+title),description:body(title),image:image(art),location:"Wilayah Contoh "+(i+1),date:date(i*7+2),created_at:date(i*7+2)})));
  rows("sip_laporan",[{month:9,year:2026},{month:8,year:2026},{month:7,year:2026},{month:null,year:2025}].map((period,i)=>({id:id("sip-laporan",i),title:label(`Laporan ${period.month?"Bulanan "+period.month:"Tahunan"} ${period.year} — Dokumen HTML`),type:period.month?"bulanan":"tahunan",period_month:period.month,period_year:period.year,file_url:`/demo-content/laporan-${i+1}.html`,created_at:date(i+1)})));
  // Some local databases retain report columns from an older CMS schema.
  const reportColumns = (await db.query("SHOW COLUMNS FROM sip_laporan")).map(c=>c.Field);
  for (const report of datasets.get("sip_laporan")) {
    if(reportColumns.includes("description")) report.description=intro;
    if(reportColumns.includes("image")) report.image=image("community");
  }
  rows("lazsip_programs",topics.map(([title,art],i)=>({id:id("lazsip-program",i),title:label(title),description:body(title),requirements:"Contoh informasi persyaratan. Bukan pembukaan pendaftaran program resmi.",image:image(art),category:i===1?"pendidikan":"umum",type:"berita",registration_open:false,is_pinned:i<2,created_at:date(i*4+1)})));
  rows("lazsip_activities",["Persiapan Relawan", "Edukasi Kepedulian", "Latihan Koordinasi", "Dokumentasi Bantuan"].map((title,i)=>({id:id("lazsip-activity",i),title:label(title),description:body(title),image:image(i%2?"education":"volunteers"),date:date(i*6+2),is_pinned:i<2,created_at:date(i*6+2)})));
  rows("lazsip_partners",["Komunitas Contoh A","Lembaga Contoh B","Relawan Contoh C"].map((name,i)=>({id:id("lazsip-partner",i),name:label(name),logo:image("volunteers"),url:null})));
  rows("lazsip_beneficiaries",topics.slice(0,4).map(([title,art,aid],i)=>({id:id("lazsip-beneficiary",i),name:label("Penerima Bantuan "+(i+1)),address:"Alamat fiktif untuk contoh; bukan alamat penerima asli.",problem_faced:intro,birth_date:new Date("1994-01-01T00:00:00Z"),age:32,gender:i%2?"perempuan":"laki-laki",referral_source:"Data contoh",photo:image(art),needs:"Contoh kebutuhan: "+title,aid_type:aid,amount_received:0,verifier_name:"Tim Contoh",verifier_area:"Wilayah Contoh",marital_status:"menikah",is_pinned:i<2,created_at:date(i*4)})));
  const entries = [];
  for (const kind of ["kegiatan","campaign","berita"]) for(let i=0;i<3;i++) {
    const title = kind==="campaign" ? ["Dukungan Logistik Kemanusiaan","Perlengkapan Tim Pertolongan","Pemulihan Wilayah Terdampak"][i] : kind==="kegiatan" ? ["Latihan Tim Pencarian","Koordinasi Relawan Lapangan","Persiapan Peralatan Pertolongan"][i] : ["Mengenal Kegiatan SARSIP","Kabar Tim Relawan","Dokumentasi Aksi Kemanusiaan"][i];
    entries.push({id:id("sarsip-"+kind,i),kind,title:label(title),description:body(title),location:"Wilayah Contoh "+(i+1),event_date:date(i*6+2),image:image(i%2?"volunteers":"rescue"),target_amount:kind==="campaign"?(i+1)*10000000:0,status:i===2&&kind==="berita"?"draft":"published",created_at:date(i*6+2),updated_at:anchor});
  }
  rows("sarsip_entries",entries);
  rows("sarsip_beneficiaries",["Evakuasi","Kebutuhan Pokok","Kesehatan","Pemulihan"].map((category,i)=>({id:id("sarsip-beneficiary",i),name:label("Keluarga "+(i+1)),public_name:label("Keluarga "+(i+1)),phone:null,location:"Wilayah Contoh "+(i+1),assistance:"Contoh dukungan "+category,category,amount:0,image:image(i%2?"community":"rescue"),is_published:true,received_at:date(i*5+1),notes:intro,created_at:date(i*5+1),updated_at:anchor})));
  if (process.argv.includes("--clean")) {
    const campaignIds=datasets.get("lazsip_campaigns").map(r=>r.id), programIds=datasets.get("lazsip_programs").map(r=>r.id), sarCampaignIds=entries.filter(e=>e.kind==="campaign").map(e=>e.id);
    const linked = await db.query("SELECT (SELECT COUNT(*) FROM payment_transactions WHERE source_id IN (?))+(SELECT COUNT(*) FROM lazsip_donations WHERE campaign_id IN (?))+(SELECT COUNT(*) FROM lazsip_campaign_adjustments WHERE campaign_id IN (?))+(SELECT COUNT(*) FROM lazsip_program_applicants WHERE program_id IN (?)) AS n",[[...campaignIds,...sarCampaignIds],campaignIds,campaignIds,programIds]);
    if(Number(linked[0].n)>0) throw new Error("Data dummy sudah memiliki transaksi/pendaftar. Pembersihan ditolak agar riwayat tetap aman.");
    await db.beginTransaction();
    for (const [table, data] of [...datasets].reverse()) await db.query(`DELETE FROM ${quote(table)} WHERE id IN (?)`,[data.map(r=>r.id)]);
    await db.commit(); console.log("Data konten dummy dihapus; konten lainnya tidak diubah.");
  } else {
    const directory = path.resolve("public/demo-content"); await fs.mkdir(directory,{recursive:true});
    const art = {community:["KEPEDULIAN SOSIAL","#2c4039","M300 400l180-140 180 140v160H300zM740 350h130v210H740z"],education:["PENDIDIKAN","#365c64","M280 280h270l50 50 50-50h270v280H650l-50 50-50-50H280z"],health:["DUKUNGAN KESEHATAN","#477553","M530 230h140v110h110v140H670v110H530V480H420V340h110z"],water:["AIR & LINGKUNGAN","#326d8b","M600 210c-110 160-180 240-180 310a180 180 0 0 0 360 0c0-70-70-150-180-310z"],volunteers:["BERSAMA RELAWAN","#7c6335","M410 470a100 100 0 0 1 200 0v120H410zM650 470a100 100 0 0 1 200 0v120H650z"],rescue:["AKSI KEMANUSIAAN","#ba642d","M320 350l140-130 140 130 140-130 140 130v230H320z"]};
    for(const [name,[caption,color,shape]] of Object.entries(art)) await fs.writeFile(path.join(directory,name+".svg"),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${color}"/><circle cx="1100" cy="50" r="340" fill="white" opacity=".08"/><circle cx="120" cy="760" r="250" fill="white" opacity=".06"/><path d="${shape}" fill="#e7f0d4"/><text x="70" y="115" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="white">DATA CONTOH / DUMMY</text><text x="70" y="710" font-family="Arial,sans-serif" font-size="40" font-weight="bold" fill="white">${caption}</text><text x="70" y="756" font-family="Arial,sans-serif" font-size="20" fill="white" opacity=".7">Ilustrasi untuk pengujian website - bukan dokumentasi kegiatan nyata</text></svg>`);
    for(let i=0;i<4;i++) await fs.writeFile(path.join(directory,`laporan-${i+1}.html`),`<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dokumen Laporan Contoh SIP</title><style>body{font:17px/1.8 system-ui;background:#f4f7f1;color:#243c30;margin:0;padding:40px 20px}main{max-width:760px;margin:auto;padding:40px;background:white;border-radius:24px}strong{color:#a35417}h1{line-height:1.2}a{color:#2c703f}</style><main><strong>DATA DUMMY - BUKAN LAPORAN RESMI</strong><h1>${datasets.get("sip_laporan")[i].title}</h1><p>${intro}</p><h2>Contoh susunan laporan</h2><ol><li>Ringkasan kegiatan pada periode laporan.</li><li>Dokumentasi pelaksanaan program dan penyaluran.</li><li>Evaluasi kegiatan serta rencana tindak lanjut.</li><li>Lampiran bukti dan informasi pendukung yang telah diverifikasi.</li></ol><p>Dokumen ini tidak mencatat penerimaan maupun pengeluaran keuangan nyata.</p><a href="/laporan">Kembali ke daftar laporan</a></main></html>`);
    await db.beginTransaction();
    const counts = {};
    for(const [table,data] of datasets) {
      let added=0;
      for(const row of data) {
        if((await db.query(`SELECT id FROM ${quote(table)} WHERE id=?`,[row.id])).length) continue;
        const columns=Object.keys(row);
        await db.query(`INSERT INTO ${quote(table)} (${columns.map(quote).join(",")}) VALUES (${columns.map(()=>"?").join(",")})`,Object.values(row));added++;
      }
      counts[table]={added,totalDummy:data.length};
    }
    await db.commit();console.log(JSON.stringify(counts,null,2));
    console.log("Konten [CONTOH] siap. Data asli, akun, rekening, serta transaksi pembayaran tidak diubah.");
  }
} catch(error) { await db.rollback().catch(()=>{});console.error(error.message);process.exitCode=1; }
finally { await db.end(); }
