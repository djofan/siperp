import type { RecapExport } from "./task-recap-export";
import type { TaskRecapDetail } from "../../api/task-recaps";

const statuses:Record<string,string> = {missing:"Belum mengumpulkan",pending:"Menunggu koreksi",approved:"Disetujui",rejected:"Perlu diulang"};
const types:Record<string,string> = {voice_note:"Audio",video:"Video",quiz:"Kuis"};
const date = (value:Date|string|null) => value ? new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"medium",timeStyle:"short"}).format(new Date(value)) + " WIB" : "";
type Member = TaskRecapDetail["participants"][number];
type Cell = string|number|null;
export async function buildTaskRecapWorkbook(data:RecapExport) {
  const {Workbook} = await import("exceljs");
  const workbook = new Workbook(); workbook.creator = "SIPERP";
  const participants = new Map<string,{member:Member;tasks:number;missing:number;pending:number;approved:number;rejected:number;late:number;last:Date|null}>();
  const tasks:Cell[][] = [], detail:Cell[][] = [];
  for (const {task,participants:members} of data.tasks) {
    const counts = {missing:0,pending:0,approved:0,rejected:0};
    for (const member of members) {
      const sent = member.submission;
      const status = sent?.status ?? "missing";
      counts[status]++;
      const summary = participants.get(member.id) ?? {member,tasks:0,missing:0,pending:0,approved:0,rejected:0,late:0,last:null};
      summary.tasks++; summary[status]++;
      if (sent?.isLate) summary.late++;
      if (sent && (!summary.last || new Date(sent.submittedAt) > summary.last)) summary.last = new Date(sent.submittedAt);
      participants.set(member.id,summary);
      detail.push([detail.length+1,task.id,task.title,types[task.type] ?? task.type,task.teacher?.name ?? "PIC tidak tersedia",task.teacher?.code ?? "",task.groups.map(g=>`${g.code} · ${g.name}`).join(", "),member.code,member.name,member.group?.code ?? "",member.group?.name ?? "Tanpa kelompok",member.active?"Aktif":"Nonaktif",member.currentlyAssigned?"Ya":"Tidak",statuses[status],sent?.score ?? null,sent?.attemptsCount ?? null,date(task.deadline),sent?date(sent.submittedAt):"",sent?(sent.isLate?"Terlambat":"Tepat waktu"):"Belum mengumpulkan"]);
    }
    tasks.push([tasks.length+1,task.id,task.title,types[task.type] ?? task.type,task.teacher?.code ?? "",task.teacher?.name ?? "PIC tidak tersedia",task.groups.map(g=>`${g.code} · ${g.name}`).join(", "),date(task.createdAt),date(task.originalDeadline),date(task.deadline),members.length,members.length-counts.missing,counts.missing,counts.pending,counts.approved,counts.rejected]);
  }
  const summaries:Cell[][] = [...participants.values()].sort((a,b)=>a.member.code.localeCompare(b.member.code,"id")).map((r,i)=>[i+1,r.member.code,r.member.name,r.member.group?.code ?? "",r.member.group?.name ?? "Tanpa kelompok",r.member.active?"Aktif":"Nonaktif",r.tasks,r.tasks-r.missing,r.approved,r.pending,r.rejected,r.missing,r.late,date(r.last)]);
  function sheet(name:string, table:string, headers:string[], rows:Cell[][], note:string) {
    const ws = workbook.addWorksheet(name,{views:[{state:"frozen",ySplit:5}],pageSetup:{orientation:"landscape",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:"1:5"}});
    ws.columns = headers.map((h,i)=>({width:i===0?7:/(Nama|Tugas|PIC|Kelompok)/i.test(h)?30:22}));
    ws.mergeCells(1,1,1,headers.length); ws.getCell(1,1).value = `TANWIR QURANI · ${name.toUpperCase()}`;
    ws.getRow(1).height=34; ws.getCell(1,1).font={bold:true,size:16,color:{argb:"FFFFFFFF"}};ws.getCell(1,1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF1F4D43"}};
    ws.mergeCells(2,1,2,headers.length); ws.getCell(2,1).value=`Seluruh data rekap · Mulai diambil ${date(data.startedAt)} · ${rows.length} baris`;
    ws.mergeCells(3,1,3,headers.length); ws.getCell(3,1).value=note;ws.getRow(3).height=34;ws.getCell(3,1).alignment={wrapText:true,vertical:"middle"};
    ws.addTable({name:table,ref:"A5",headerRow:true,style:{theme:"TableStyleMedium4",showRowStripes:true},columns:headers.map(name=>({name,filterButton:true})),rows});
    ws.getRow(5).height=36;
    ws.eachRow((row,index)=>{if(index>=5)row.eachCell({includeEmpty:true},cell=>{cell.alignment={vertical:"top",wrapText:true};});});
    return ws;
  }
  sheet("Ringkasan peserta","RingkasanPeserta",["No","Kode peserta","Nama peserta","Kode kelompok saat ini","Kelompok saat ini","Status akun","Tugas dalam rekap","Sudah mengumpulkan","Disetujui","Menunggu koreksi","Perlu diulang","Belum mengumpulkan","Pengumpulan terlambat","Pengumpulan terakhir"],summaries,"Setiap peserta dihitung satu kali. Tugas mencakup sasaran kelompok saat ini dan setoran lama. Kelompok adalah kelompok saat data diambil; perpindahan historis tidak direkonstruksi.");
  sheet("Rekap tugas","RekapTugas",["No","ID tugas","Judul tugas","Jenis","Kode PIC pembuat","PIC pembuat","Kelompok tujuan","Tugas dibuat","Tenggat awal","Tenggat saat ini","Peserta dalam rekap","Sudah mengumpulkan","Belum mengumpulkan","Menunggu koreksi","Disetujui","Perlu diulang"],tasks,"Seluruh tugas, tanpa filter layar atau batas halaman. Peserta nonaktif dan hasil peserta yang sudah pindah kelompok tetap disertakan sesuai cakupan rekap.");
  const ws=sheet("Rincian progres","RincianProgres",["No","ID tugas","Judul tugas","Jenis","PIC pembuat","Kode PIC","Kelompok tujuan","Kode peserta","Nama peserta","Kode kelompok saat ini","Kelompok saat ini","Status akun","Sasaran saat ini","Status tugas","Nilai","Jumlah percobaan","Tenggat saat ini","Waktu pengumpulan","Ketepatan waktu"],detail,"Satu baris per tugas dan peserta. Nilai kosong berarti belum ada nilai, bukan nol. Status/nilai/setoran mengikuti data terakhir yang tersimpan; bukan seluruh riwayat percobaan atau koreksi. Tidak menyertakan berkas pribadi atau kunci jawaban.");
  ws.getColumn(15).numFmt="0.##";
  return workbook.xlsx.writeBuffer();
}
