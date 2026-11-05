import type { AidValues } from "@/contracts/modules/bantuan";

export interface MessageImport { applicant: AidValues; survey: AidValues; warnings: string[] }
const clean = (s:string) => s.replace(/[\uFE0F\u20E3]/g,"").replace(/^[^\p{L}]+/u,"").replace(/[*_]/g,"").trim();
const key = (s:string) => clean(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
// Match explicit labels, not words inside the applicant's story.
const aliases: [RegExp,string][] = [
  [/^(nama lengkap|nama pemohon|nama penerima(?: manfaat)?)$/, "nama"],
  [/^(no(?:mor)? (?:ktp|nik)|nomor induk kependudukan)$/, "nik"],
  [/^(telp|telepon|hp|wa|whatsapp|no(?:mor)? (?:hp|telp|telepon|wa|whatsapp))(?: yang bisa dihubungi)?$/, "no hp"],
  [/^(alamat|alamat domisili|domisili|alamat sekarang)$/, "alamat lengkap"],
  [/^(ttl|tempat tgl lahir|tempat dan tanggal lahir)$/, "tempat tanggal lahir"],
  [/^(status|status perkawinan)$/, "status pernikahan"],
  [/^(tempat tinggal|kepemilikan rumah|status rumah)$/, "status tempat tinggal"],
  [/^(kerja|profesi)$/, "pekerjaan"],
  [/^(pendapatan|gaji)(?: per (hari|minggu|bulan))?$/, "penghasilan"],
  [/^(biaya (?:kontrak|kontrakan|sewa)|sewa rumah)$/, "berapa biaya sewa"],
  [/^(tanggungan|jml tanggungan)$/, "jumlah tanggungan"],
  [/^(kendala|permasalahan|masalah|keluhan)$/, "masalah yang dihadapi"],
  [/^(sumber informasi|info dari)$/, "asal mendapat informasi"],
  [/^(salat|shalat)(?: 5 waktu)?$/, "sholat"],
  [/^(pernah dibantu|bantuan sebelumnya)$/, "apakah sudah pernah dibantu"],
  [/^(punya sktm|memiliki sktm|sktm)$/, "sudah memiliki sktm"],
  [/^(izin publikasi|bersedia dipublikasikan)$/, "bersedia dipublikasi"],
  [/^(upaya|usaha yang dilakukan)$/, "usaha serta upaya"],
  [/^(kondisi rumah|pengamatan rumah)$/, "pengamatan visual"],
  [/^(kebutuhan|bantuan yang diperlukan)$/, "kebutuhan bantuan"],
  [/^(saran verifikator|saran)$/, "kritik serta saran"],
  [/^(tgl survei|tanggal survei|tgl verifikasi)$/, "tanggal verifikasi"],
  [/^(catatan|keterangan tambahan)$/, "catatan tambahan"],
];
const canonical = (label:string) => aliases.find(([pattern])=>pattern.test(label))?.[1] ?? label;
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
  const v=key(value).replace(/^(?:alhamdulillah\s+)?(?:(?:saya|pemohon|beliau)\s+)?/,"");
  if(/\b(?:atau)\b|\//.test(value.toLowerCase()) || /\bbelum tahu\b|\btidak tahu\b|\bmungkin\b|\bragu\b/.test(v))return;
  if(/\b(tapi|tetapi|namun)\b/.test(v))return;
  if(/^(sudah|udah) (tidak|tdk|nggak|gak|ga|tak)\b/.test(v))return false;
  if(/^(tidak|tdk|tak|belum|blm|ga|gak|nggak|enggak|ngga|gk|no|n|tak pernah)\b/.test(v))return false;
  if(/^(ya|iya|iyah|y|yes|sudah|sdh|udah|sudah pernah|bersedia|setuju|boleh|mau|pernah|punya|ada)\b/.test(v))return true;
}
function frequency(value:string):string|undefined {
  const v=key(value);
  if(/\batau\b|\//.test(value.toLowerCase()))return;
  if(/^(jarang|kadang|kadang kadang|sesekali|terkadang|tidak rutin|belum rutin|tidak selalu|tidak setiap hari)\b/.test(v))return "Jarang";
  if(/^(bukan perokok|sudah berhenti|udah berhenti)\b/.test(v))return "Tidak";
  const b=bool(value);if(b!==undefined)return b?"Ya":"Tidak";
  if(/^(rutin|selalu|setiap hari|lima waktu|5 waktu)\b/.test(v))return "Ya";
}
function marital(value:string):string|undefined {
  const v=key(value);
  if(/\batau\b|\//.test(value))return;
  if(/^(belum (?:menikah|kawin)|lajang|single|bujang|perjaka|gadis)$/.test(v))return "Belum menikah";
  if(/^(sudah )?(menikah|kawin|berkeluarga)$/.test(v))return "Menikah";
  if(/^(janda mati|janda ditinggal mati|janda suami meninggal)$/.test(v))return "Janda mati";
  if(/^janda(?: cerai)?$/.test(v))return "Janda";
  if(/^duda(?: cerai| ditinggal mati)?$/.test(v))return "Duda";
}
function housing(value:string):string|undefined {
  const v=key(value);
  if(/\batau\b|\//.test(value))return;
  if(/^(ngontrak|kontrak|kontrak sewa|kontrakan|sewa|kos|kost)(?:\b)/.test(v))return "Kontrak-sewa";
  if(/^(milik sendiri|rumah sendiri|punya sendiri|sendiri)$/.test(v))return "Milik sendiri";
  if(/^(tinggalan orang tua|rumah orang tua|milik orang tua|ikut orang tua|bersama orang tua|tinggal dengan orang tua)$/.test(v))return "Tinggalan orang tua";
  if(/^(menumpang|numpang|ikut saudara|ikut kerabat)/.test(v))return "Menumpang";
  if(/^lainnya$/.test(v))return "Lainnya";
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
  let current:typeof entries[number]|undefined;
  for(const raw of message.replace(/\r/g,"").split("\n")){
    const line=raw.replace(/[\uFE0F\u20E3]/g,"").replace(/^\s*(?:[0-9]+[.)]?\s+(?=\p{L})|[🚨📝🔰📌*•#-]+\s*)/u,"").replace(/[*_]/g,"").trim();
    if(/^data pelapor/i.test(clean(line))){reporter=true;current=undefined;continue;}
    if(/^data pemohon/i.test(clean(line))){reporter=false;current=undefined;continue;}
    const parts=line.match(/^(.+?)\s*(?::|：|=|\s[-–—]\s)\s*(.*)$/);
    if(parts){current={label:reporter?key(parts[1]):canonical(key(parts[1].replace(/\([^)]*\)/g,""))),value:parts[2].trim(),reporter};entries.push(current);}
    else {
      const label=canonical(key(line.replace(/\([^)]*\)/g,"")));
      const marked=/^\s*(?:\d{1,2}[.)]\s+|\d[\d\s\uFE0F\u20E3]*\u20E3|[📝📌])/u.test(raw);
      const recognized=[...textFields,...surveyFields].some(([pattern])=>pattern.test(label))||/^(?:tempat tanggal lahir|usia|umur|jenis kelamin|penghasilan|berapa biaya|jumlah tanggungan|sholat|merokok|apakah sudah pernah dibantu|bersedia dipublikasi|bersedia mengurus sktm|sudah memiliki sktm|sudah berapa lama tinggal|tanggal verifikasi|kerabat atau tetangga)/.test(label);
      const plainHeading=/^(?:latar belakang|kondisi saat ini|kebutuhan bantuan(?: yang (?:diperlukan|dibutuhkan))?|usaha serta upaya(?: yang telah dilakukan)?|pengamatan visual kondisi tempat tinggal(?: menurut verifikator)?|catatan tambahan)$/i.test(label);
      if(recognized&&(marked||plainHeading||/^(?:kerabat atau tetangga|catatan catatan|apa kritik|kritik serta saran|sudah berapa lama tinggal|track record|pengamatan visual|usaha serta upaya)/.test(label))){
        current={label,value:"",reporter};entries.push(current);
      }else if(marked){
        current=undefined;
        result.warnings.push(`Judul “${clean(line)}” belum dikenali. Periksa dan isi kolom terkait secara manual.`);
      }else if(current&&line&&!/^form\b/i.test(clean(line))){current.value+=(current.value?"\n":"")+raw.trim();}
    }
  }
  const seen=new Set<string>();
  for(const entry of entries){
    const {label,value}=entry;
    if(!value||/^[.\s…_-]+$/.test(value)||/^(tahun|laki laki\/perempuan|ya\/tidak|ya\/jarang\/tidak)$/i.test(value))continue;
    const entryKey=`${entry.reporter}:${label}`;
    if(seen.has(entryKey)){result.warnings.push(`Kolom “${label}” muncul lebih dari sekali. Isian pertama dipertahankan; periksa pesan sumber.`);continue;}
    seen.add(entryKey);
    const a=result.applicant,s=result.survey;
    if(entry.reporter){
      const field=({nama:"reporterName",status:"reporterRelationship","yayasan lembaga perorangan":"reporterOrganization",alamat:"reporterAddress","no telp":"reporterPhone","program bantuan":"reporterProgram"} as Record<string,string>)[label];
      if(field)a[field]=value;
      continue;
    }
    const field=textFields.find(([pattern])=>pattern.test(label));
    if(field){
      if(field[1]==="nik"){const nik=value.replace(/\s/g,"");if(/^\d{16}$/.test(nik))a.nik=nik;else result.warnings.push("NIK belum valid 16 digit; isi secara manual.");}
      else if(field[1]==="maritalStatus"){const found=marital(value);if(found)a.maritalStatus=found;else result.warnings.push("Status pernikahan perlu dipilih manual.");}
      else if(field[1]==="housing"){const found=housing(value);if(found)a.housing=found;else result.warnings.push("Status tempat tinggal belum pasti; pilih sesuai kondisi pemohon.");}
      else a[field[1]]=value;
      continue;
    }
    const sf=surveyFields.find(([pattern])=>pattern.test(label));if(sf){s[sf[1]]=value;continue;}
    if(/^tempat tanggal lahir/.test(label)){
      const found=date(value);if(found)a.birthDate=found;else result.warnings.push("Tanggal lahir perlu diperiksa dan diisi manual.");
      const place=value.split(/,|\d/)[0].trim();if(place)a.birthPlace=place;
    }else if(/^usia|^umur|^jenis kelamin$|^gender$/.test(label)){
      const v=key(value).replace(/^\d+\s*(tahun|thn|th)\s*/,"");
      if(/^(perempuan|wanita|cewek|p)$/.test(v))a.gender="perempuan";else if(/^(laki laki|pria|cowok|l)$/.test(v))a.gender="laki_laki";
      else if(/jenis kelamin|gender/.test(label))result.warnings.push("Jenis kelamin belum pasti; pilih manual.");
    }else if(/^(periode penghasilan|periode pendapatan)$/.test(label)){
      const v=key(value);const period=/^(?:per )?(?:hari|harian)$/.test(v)?"hari":/^(?:per )?(?:pekan|minggu|mingguan)$/.test(v)?"pekan":/^(?:per )?(?:bulan|bulanan)$/.test(v)?"bulan":undefined;
      if(period)a.incomePeriod=period;else result.warnings.push("Periode penghasilan belum pasti; pilih manual.");
    }else if(/^penghasilan/.test(label)){
      const n=money(value);if(n!==undefined)a.income=n;
      if(/hari/i.test(value))a.incomePeriod="hari";else if(/pekan|minggu/i.test(value))a.incomePeriod="pekan";else if(/bulan/i.test(value))a.incomePeriod="bulan";
    }else if(/^berapa biaya/.test(label)){
      const n=money(value);if(n!==undefined){a.rent=n;a.rentPeriod=/tahun/i.test(value)?"tahun":"bulan";}
    }else if(/^jumlah tanggungan/.test(label)){
      const n=value.match(/^\d+/);if(n)a.dependentCount=Number(n[0]);if(value.length>(n?.[0].length??0))a.dependents=value;
    }else if(/^sholat|^merokok/.test(label)){
      const v=frequency(value);if(v)a[/^sholat/.test(label)?"prayer":"smoking"]=v;else result.warnings.push(`Jawaban “${label}” belum pasti; periksa dan pilih manual.`);
    }else if(/^apakah sudah pernah dibantu/.test(label)){
      const b=bool(value);if(b!==undefined)a.previousAid=b;else result.warnings.push("Riwayat bantuan belum pasti; periksa pilihan Ya/Tidak.");a.previousAidNotes=value;
    }else if(/^bersedia dipublikasi|^bersedia mengurus sktm/.test(label)){
      const b=bool(value);if(b!==undefined)a[/dipublikasi/.test(label)?"publicationConsent":"willingSktm"]=b;else result.warnings.push(`Jawaban “${label}” belum pasti; periksa pilihan Ya/Tidak.`);
    }else if(/^sudah memiliki sktm/.test(label)){
      const b=bool(value);if(b!==undefined){a.hasSktm=b;s.hasSktm=b;}else result.warnings.push("Kepemilikan SKTM belum pasti; periksa pilihan Ya/Tidak.");if(b===false)s.sktmExplanation=value;
    }else if(/^sudah berapa lama tinggal/.test(label)){
      const n=value.match(/\d+/);if(n)s.stayDuration=Number(n[0]);if(/tahun|bulan/i.test(value))s.stayUnit=/tahun/i.test(value)?"tahun":"bulan";
    }else if(/^tanggal verifikasi/.test(label)){const d=date(value);if(d)s.date=d;else result.warnings.push("Tanggal verifikasi belum dikenali.");}
    else if(/^kerabat atau tetangga/.test(label)){s.notes=[s.notes,`Kontak kerabat/tetangga: ${value}`].filter(Boolean).join("\n");result.warnings.push("Periksa kontak kerabat/tetangga pada catatan, lalu lengkapi daftar kontak survei.");}
  }
  return result;
}
