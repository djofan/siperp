import type { AidValues } from "@/contracts/modules/bantuan";

export interface MessageImport { applicant: AidValues; survey: AidValues; warnings: string[] }
const clean = (s:string) => s.replace(/[\uFE0F\u20E3]/g,"").replace(/^[^\p{L}]+/u,"").replace(/[*_]/g,"").trim();
const key = (s:string) => clean(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const textFields: [RegExp,string][] = [
  [/^nama$/, "name"], [/^nik$/, "nik"], [/^status (?:menikah|pernikahan)/,"maritalStatus"],
  [/^alamat lengkap/,"street"], [/^status tempat tinggal/,"housing"], [/^pekerjaan/,"job"],
  [/^no (?:hp|telp)|^nomor (?:hp|telepon)/,"phone"], [/^asal mendapat informasi/,"informationSource"],
  [/^masalah yang dihadapi/,"problem"],
];
const surveyFields: [RegExp,string][] = [
  [/^latar belakang/,"background"], [/^kondisi saat ini/,"currentCondition"],
  [/^kebutuhan bantuan/,"needs"], [/^usaha serta upaya/,"efforts"],
  [/^pengamatan visual/,"homeObservation"], [/^track record/,"socialRecord"],
  [/^apa kritik|^kritik serta saran/,"suggestions"], [/^catatan catatan|^catatan tambahan/,"notes"],
];
function money(value:string):number|undefined {
  const match=value.toLowerCase().match(/(?:rp\.?\s*)?(\d[\d.,]*)\s*(juta|jt|ribu|rb)?/);
  if(!match)return;
  const n=match[2]?Number(match[1].replace(",","."))*(/j/.test(match[2])?1000000:1000):Number(match[1].replace(/[.,]/g,""));
  return Number.isSafeInteger(n)&&n>=0?n:undefined;
}
function bool(value:string):boolean|undefined {
  if(/^(ya|sudah|bersedia|pernah)\b/i.test(value))return true;
  if(/^(tidak|belum|ga|gak)\b/i.test(value))return false;
}
function date(value:string):string|undefined {
  const months=["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"];
  let y:number,m:number,d:number;
  const iso=value.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  const numeric=value.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  const named=value.toLowerCase().match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/);
  if(iso){[,y,m,d]=iso.map(Number);}else if(numeric){[,d,m,y]=numeric.map(Number);}else if(named){d=Number(named[1]);m=months.indexOf(named[2])+1;y=Number(named[3]);}else return;
  const check=new Date(Date.UTC(y,m-1,d));
  if(m<1||check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)return;
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
export function parseWhatsappMessage(message:string):MessageImport {
  const result:MessageImport={applicant:{},survey:{},warnings:[]};
  let reporter=false;
  const entries:{label:string;value:string;reporter:boolean}[]=[];
  for(const raw of message.replace(/\r/g,"").split("\n")){
    const line=clean(raw);
    if(/data pelapor/i.test(line)){reporter=true;continue;}
    if(/data pemohon/i.test(line)){reporter=false;continue;}
    const colon=line.indexOf(":");
    if(colon>=0){entries.push({label:key(line.slice(0,colon)),value:line.slice(colon+1).trim(),reporter});}
    else if(entries.length&&line&&!/form |data pemohon|sip\/lazsip/i.test(line)){entries[entries.length-1].value+="\n"+raw.trim();}
  }
  for(const entry of entries){
    const {label,value}=entry;
    if(!value||/^[.\s…_-]+$/.test(value)||/^(tahun|laki laki\/perempuan|ya\/tidak|ya\/jarang\/tidak)$/i.test(value))continue;
    const a=result.applicant,s=result.survey;
    if(entry.reporter){
      const field=({nama:"reporterName",status:"reporterRelationship","yayasan lembaga perorangan":"reporterOrganization",alamat:"reporterAddress","no telp":"reporterPhone","program bantuan":"reporterProgram"} as Record<string,string>)[label];
      if(field)a[field]=value;
      continue;
    }
    const field=textFields.find(([pattern])=>pattern.test(label));
    if(field){
      if(field[1]==="nik"){const nik=value.replace(/\s/g,"");if(/^\d{16}$/.test(nik))a.nik=nik;else result.warnings.push("NIK belum valid 16 digit; isi secara manual.");}
      else if(field[1]==="maritalStatus"){const statuses=["Janda mati","Belum menikah","Menikah","Duda","Janda"];const found=statuses.find(x=>value.toLowerCase()===x.toLowerCase());if(found)a.maritalStatus=found;else result.warnings.push("Status pernikahan perlu dipilih manual.");}
      else if(field[1]==="housing"){const v=value.toLowerCase();a.housing=/kontrak|sewa/.test(v)?"Kontrak-sewa":/sendiri/.test(v)?"Milik sendiri":/orang tua/.test(v)?"Tinggalan orang tua":/menumpang/.test(v)?"Menumpang":"Lainnya";}
      else a[field[1]]=value;
      continue;
    }
    const sf=surveyFields.find(([pattern])=>pattern.test(label));if(sf){s[sf[1]]=value;continue;}
    if(/^tempat tanggal lahir/.test(label)){
      const found=date(value);if(found)a.birthDate=found;else result.warnings.push("Tanggal lahir perlu diperiksa dan diisi manual.");
      const place=value.split(/,|\d/)[0].trim();if(place)a.birthPlace=place;
    }else if(/^usia/.test(label)){
      if(/perempuan/i.test(value))a.gender="perempuan";else if(/laki/i.test(value))a.gender="laki_laki";
    }else if(/^penghasilan/.test(label)){
      const n=money(value);if(n!==undefined)a.income=n;
      if(/hari/i.test(value))a.incomePeriod="hari";else if(/pekan|minggu/i.test(value))a.incomePeriod="pekan";else if(/bulan/i.test(value))a.incomePeriod="bulan";
    }else if(/^berapa biaya/.test(label)){
      const n=money(value);if(n!==undefined){a.rent=n;a.rentPeriod=/tahun/i.test(value)?"tahun":"bulan";}
    }else if(/^jumlah tanggungan/.test(label)){
      const n=value.match(/^\d+/);if(n)a.dependentCount=Number(n[0]);if(value.length>(n?.[0].length??0))a.dependents=value;
    }else if(/^sholat|^merokok/.test(label)){
      const v=value.match(/^(ya|jarang|tidak)\b/i)?.[0];if(v)a[/^sholat/.test(label)?"prayer":"smoking"]=v[0].toUpperCase()+v.slice(1).toLowerCase();
    }else if(/^apakah sudah pernah dibantu/.test(label)){
      const b=bool(value);if(b!==undefined)a.previousAid=b;a.previousAidNotes=value;
    }else if(/^bersedia dipublikasi|^bersedia mengurus sktm/.test(label)){
      const b=bool(value);if(b!==undefined)a[/dipublikasi/.test(label)?"publicationConsent":"willingSktm"]=b;
    }else if(/^sudah memiliki sktm/.test(label)){
      const b=bool(value);if(b!==undefined){a.hasSktm=b;s.hasSktm=b;}if(b===false)s.sktmExplanation=value;
    }else if(/^sudah berapa lama tinggal/.test(label)){
      const n=value.match(/\d+/);if(n)s.stayDuration=Number(n[0]);if(/tahun|bulan/i.test(value))s.stayUnit=/tahun/i.test(value)?"tahun":"bulan";
    }else if(/^tanggal verifikasi/.test(label)){const d=date(value);if(d)s.date=d;else result.warnings.push("Tanggal verifikasi belum dikenali.");}
    else if(/^kerabat atau tetangga/.test(label)){s.notes=[s.notes,`Kontak kerabat/tetangga: ${value}`].filter(Boolean).join("\n");result.warnings.push("Periksa kontak kerabat/tetangga pada catatan, lalu lengkapi daftar kontak survei.");}
  }
  return result;
}
