import {bantuanStatuses} from "@/contracts/modules/bantuan";
export type ReportRow=Record<string,string|number|null>;
export async function reportWorkbook(rows:ReportRow[],filters:string,logoBase64?:string){
 const ExcelJS=await import("exceljs");const book=new ExcelJS.Workbook();book.creator="LAZSIP";book.created=new Date();
 const recap=book.addWorksheet("Rekap permohonan",{views:[{state:"frozen",ySplit:7,showGridLines:false}],pageSetup:{orientation:"landscape",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:"1:7",margins:{left:0.25,right:0.25,top:0.3,bottom:0.3,header:0.1,footer:0.15}}});
 recap.columns=[6,23,27,48,52,25,16,16,16,36].map(width=>({width}));
 recap.mergeCells("A1:B3");recap.mergeCells("C1:J1");recap.mergeCells("C2:J2");recap.mergeCells("C3:J3");recap.mergeCells("A4:J4");recap.mergeCells("A5:J5");
 recap.getCell("C1").value="REKAPITULASI DATA PERMOHONAN BANTUAN";
 recap.getCell("C2").value="LEMBAGA AMIL ZAKAT SOLIDARITAS INSAN PEDULI (LAZSIP)";
 recap.getCell("C3").value="Periode / filter: "+(filters||"Semua data sesuai akses admin");
 recap.getCell("A4").value="Dibantu: bantuan selesai diserahkan. Tidak dibantu: ditolak, dibatalkan, atau dana dikembalikan.";
 recap.getCell("A5").value="Ditunda: menunggu kelengkapan data. Tahap lain ditulis pada Keterangan dan belum ditandai sebagai hasil akhir.";
 if(logoBase64){const image=book.addImage({base64:logoBase64,extension:"png"});recap.addImage(image,{tl:{col:0.15,row:0.15},ext:{width:165,height:64}});}else recap.getCell("A1").value="LAZSIP";
 for(const range of ["A6:A7","B6:B7","C6:D6","E6:E7","F6:F7","G6:I6","J6:J7"])recap.mergeCells(range);
 for(const [cell,title] of Object.entries({A6:"NO",B6:"HARI, TANGGAL",C6:"PEMOHON (MUSTAHIK)",C7:"Nama",D7:"Alamat",E6:"MASALAH YANG DIHADAPI",F6:"NAMA PELAPOR",G6:"STATUS",G7:"Dibantu",H7:"Tidak Dibantu",I7:"Ditunda",J6:"KETERANGAN"}))recap.getCell(cell).value=title;
 const dateValue=(value:ReportRow[string])=>{const raw=String(value??"").slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return null;const d=new Date(raw+"T00:00:00Z");return Number.isNaN(d.getTime())?null:d;};
 rows.forEach((r,i)=>{const status=String(r.status);const notes=[String(r.number??""),String(r.program??""),bantuanStatuses[status]??status,r.amount!=null?"Ditetapkan: Rp "+Number(r.amount).toLocaleString("id-ID"):"",r.paidAmount!=null?"Diserahkan: Rp "+Number(r.paidAmount).toLocaleString("id-ID"):""].filter(Boolean).join("\n");
 const row=recap.getRow(i+8);row.values=[i+1,dateValue(r.createdAt),r.name??"",r.address??"",r.problem??"",r.reporterName??"",status==="completed"?"Ya":"",["rejected_screening","rejected_t1","rejected_t2","rejected_bypass","cancelled","returned"].includes(status)?"Ya":"",status==="needs_data"?"Ya":"",notes];
 const lineCount=(value:unknown,width:number)=>String(value??"").split("\n").reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/width)),0);
 row.height=Math.min(409,Math.max(64,...[3,4,5,6,10].map(c=>lineCount(row.getCell(c).value,Number(recap.getColumn(c).width)-3)*14+12)));
 row.getCell(2).numFmt='[$-421]dddd, dd mmmm yyyy';
 });
 const last=Math.max(8,rows.length+7);if(!rows.length){recap.getCell("D8").value="Tidak ada pengajuan sesuai filter.";recap.getRow(8).height=40;}
 for(let r=1;r<=last;r++){const row=recap.getRow(r);for(let c=1;c<=10;c++){const cell=row.getCell(c);cell.font={name:"Arial",size:10,color:{argb:"FF172B24"},bold:r<=7};cell.alignment={vertical:"middle",horizontal:r<=7||[1,7,8,9].includes(c)?"center":"left",wrapText:true};if(r>=6)cell.border={top:{style:"thin",color:{argb:"FF5C6A62"}},bottom:{style:"thin",color:{argb:"FF5C6A62"}},left:{style:"thin",color:{argb:"FF5C6A62"}},right:{style:"thin",color:{argb:"FF5C6A62"}}};if(r===6||r===7)cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF1F6EC"}};}
 if(r>=8&&rows.length)for(const c of [7,8,9])row.getCell(c).dataValidation={type:"list",allowBlank:true,formulae:['"Ya"'],showErrorMessage:true,errorTitle:"Pilihan status",error:"Pilih Ya atau kosongkan kolom."};}
 recap.getRow(1).height=26;recap.getRow(2).height=22;recap.getRow(3).height=28;recap.getRow(4).height=20;recap.getRow(5).height=20;recap.getRow(6).height=28;recap.getRow(7).height=24;
 recap.getCell("C1").font={name:"Arial",size:14,bold:true,color:{argb:"FF1D5542"}};recap.getCell("A1").font={name:"Arial",size:20,bold:true,color:{argb:"FF71A842"}};
 for(const address of ["A4","A5"]){recap.getCell(address).font={name:"Arial",size:9,color:{argb:"FF58685F"}};recap.getCell(address).alignment={vertical:"middle",wrapText:true};}
 recap.pageSetup.printArea=`A1:J${last}`;recap.headerFooter.oddFooter="LAZSIP | Internal & rahasia | Halaman &P dari &N";
 const summary=book.addWorksheet("Ringkasan");summary.columns=[{width:38},{width:28}];
 summary.addRow(["LAPORAN PENGAJUAN BANTUAN LAZSIP"]);summary.mergeCells("A1:B1");summary.addRow(["Filter",filters||"Semua data sesuai akses admin"]);summary.addRow(["Dicetak",new Date().toLocaleString("id-ID")]);summary.addRow(["Total pengajuan",rows.length]);summary.addRow(["Nominal ditetapkan",rows.reduce((v,r)=>v+Number(r.amount??0),0)]);summary.addRow(["Bantuan diserahkan",rows.reduce((v,r)=>v+Number(r.paidAmount??0),0)]);
 summary.addRow([]);summary.addRow(["Status","Jumlah pengajuan"]);for(const status of [...new Set(rows.map(r=>String(r.status)))])summary.addRow([bantuanStatuses[status as keyof typeof bantuanStatuses]??status,rows.filter(r=>r.status===status).length]);
 summary.getCell("B5").numFmt='"Rp "#,##0';summary.getCell("B6").numFmt='"Rp "#,##0';summary.getRow(1).height=32;
 const sheet=book.addWorksheet("Rincian pengajuan",{views:[{state:"frozen",ySplit:1,xSplit:3}],pageSetup:{orientation:"landscape",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
 const columns=[['number','Nomor pengajuan',25],['name','Nama pemohon',28],['nik','NIK',22],['phone','Nomor HP',20],['address','Alamat lengkap',48],['province','Provinsi',22],['city','Kabupaten / kota',24],['district','Kecamatan',22],['village','Desa / kelurahan',22],['program','Program',24],['source','Sumber pengajuan',20],['status','Status',28],['problem','Permasalahan',50],['needs','Kebutuhan',50],['job','Pekerjaan',26],['income','Penghasilan',20],['incomePeriod','Periode penghasilan',20],['dependents','Tanggungan',16],['amount','Nominal ditetapkan',23],['paidAmount','Nominal diserahkan',23],['verifier','Verifikator',26],['distributor','Penyalur',26],['createdBy','Dibuat oleh',26],['createdAt','Tanggal pengajuan',22],['surveyDate','Tanggal survei',22],['disbursedAt','Tanggal pencairan',22],['completedAt','Tanggal selesai',22],['fundReference','Referensi dana',28],['reporterName','Nama pelapor',26],['reporterPhone','HP pelapor',20]] as const;
 sheet.columns=columns.map(([key,header,width])=>({key,header,width}));
 for(const r of rows){sheet.addRow({...r,status:bantuanStatuses[String(r.status) as keyof typeof bantuanStatuses]??r.status,source:({online:"Online / WhatsApp",walk_in:"Datang langsung",bypass:"Jalur langsung"} as Record<string,string>)[String(r.source)]??r.source});}
 sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:columns.length}};
 sheet.eachRow((row,index)=>{row.alignment={vertical:"top",wrapText:true};row.font={name:"Calibri",size:11,color:{argb:"FF163F34"}};row.height=index===1?32:50;if(index>1&&index%2===0)row.eachCell(cell=>cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF0F6EE"}});});
 for(const k of ['income','amount','paidAmount'])sheet.getColumn(k).numFmt='"Rp "#,##0';
 for(const tab of [summary,sheet]){tab.getRow(1).eachCell(cell=>{cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF1D5542"}};cell.font={name:"Calibri",size:12,bold:true,color:{argb:"FFFFFFFF"}};});tab.headerFooter.oddFooter="LAZSIP | Internal & rahasia | Halaman &P dari &N";}
 return book.xlsx.writeBuffer();
}
