import fs from 'node:fs';
const path = new URL('../docs/openapi.json', import.meta.url);
const doc = JSON.parse(fs.readFileSync(path, 'utf8'));
doc.paths['/api/v1/bantuan/santunan/periods'] = {post:{tags:['Bantuan'],summary:'Buat santunan rutin bulan berikutnya',description:'Admin/bendahara saja. Seluruh rutin bulan sumber disalin secara atomik; tidak rutin, laporan dan foto tidak disalin. Tujuan yang sudah memiliki rutin ditolak.',security:[{bearerAuth:[]}],requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['sourcePeriod'],properties:{sourcePeriod:{type:'string',pattern:'^[0-9]{4}-(0[1-9]|1[0-2])$'}}}}}},responses:{'201':{description:'Periode dibuat',headers:{Location:{schema:{type:'string'}}},content:{'application/json':{schema:{type:'object',required:['data'],properties:{data:{type:'object',required:['period','createdCount'],properties:{period:{type:'string'},createdCount:{type:'integer',minimum:1}}}}}}}},'403':{description:'Peran tidak diizinkan'},'409':{description:'Rutin bulan tujuan sudah ada'},'422':{description:'Input invalid, sumber kosong, atau penyalur tidak aktif'}}}};
const category = {type:'string',enum:['widow','orphan','foster_child','tahfidz']};
const input = {type:'object',required:['frequency','category','period','recipientName','volunteerId','amount'],properties:{
  frequency:{type:'string',enum:['routine','non_routine']},category,
  period:{type:'string',pattern:'^[0-9]{4}-(0[1-9]|1[0-2])$'},recipientName:{type:'string',maxLength:191},
  volunteerId:{type:'string',maxLength:191},amount:{type:'integer',minimum:1,maximum:9000000000000},
},allOf:[{if:{properties:{frequency:{const:'non_routine'}}},then:{properties:{category:{const:'orphan'}}}}]};
doc.components.schemas.SantunanInput = input;
doc.paths['/api/v1/bantuan/santunan'] = {...doc.paths['/api/v1/bantuan/santunan'],post:{
  tags:['Bantuan'],summary:'Tambah santunan rutin atau tidak rutin',
  description:'Admin/bendahara. Kategori rutin: widow, orphan, foster_child, tahfidz (Lembaga Tahfidz). Tidak rutin hanya orphan. Penyalur harus aktif dan memiliki akses.',
  security:[{bearerAuth:[]}],requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/SantunanInput'}}}},
  responses:{'201':{description:'Santunan dibuat; data memuat id, number, frequency, category, period, recipientName, volunteerId, amount, transferStatus, distributionStatus, transferredAt, completedAt, version, report, documents'},'403':{description:'Peran tidak diizinkan'},'422':{description:'Kategori atau penyalur tidak valid'}},
}};
fs.writeFileSync(path, JSON.stringify(doc, null, 2)+'\n');
