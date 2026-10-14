import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import sharp from "sharp";
loadEnvConfig(process.cwd());
async function main(){
const { prisma }=await import("../lib/prisma");
const { createTicket }=await import("../modules/teknisi/api/service");
const { advanceService }=await import("../modules/teknisi/api/workflow-service");
const { qualityChecks }=await import("../modules/teknisi/api/workflow-policy");
const prefix=`workflow-test-${randomUUID()}`;
const outlet=await prisma.teknisiOutlet.create({data:{name:prefix,address:"Isolated test fixture",phone:"000"}});
const other=await prisma.teknisiOutlet.create({data:{name:`${prefix}-other`,address:"Isolated test fixture",phone:"000"}});
const tech=await prisma.teknisiTechnician.create({data:{name:prefix,userId:prefix,outletId:outlet.id,activeOutletId:outlet.id,specialty:"Test"}});
const actor={id:prefix,name:prefix,role:"technician",technician:tech,canManage:false,canWrite:true};
const foreign={...actor,technician:{...tech,outletId:other.id}};
const bytes=await sharp({create:{width:20,height:20,channels:3,background:"#eeeeee"}}).png().toBuffer();
const form=(values:Record<string,string|number>,photo=false)=>{const f=new FormData();Object.entries(values).forEach(([k,v])=>f.set(k,String(v)));if(photo)f.append("photos",new File([new Uint8Array(bytes)],"test.png",{type:"image/png"}));return f;};
async function action(id:string,operation:string,values:Record<string,string|number>,photo=false){const ticket=await prisma.teknisiTicket.findUniqueOrThrow({where:{id}});return advanceService(actor,form({ticketId:id,operation,expectedVersion:ticket.updatedAt.toISOString(),...values},photo));}
try{
 const ticket=await createTicket(actor,form({outletId:outlet.id,customerName:"TEST CUSTOMER",customerPhone:"000",device:"TEST PHONE",complaint:"TEST ONLY",priority:"normal",estimate:200000,dueAt:"2030-01-01"},true));
 assert.equal(ticket.status,"received");assert.equal(await prisma.teknisiPhoto.count({where:{ticketId:ticket.id}}),1);
 await assert.rejects(()=>advanceService(foreign,form({ticketId:ticket.id,operation:"edit",expectedVersion:ticket.updatedAt.toISOString()})),/outlet/);
 await assert.rejects(()=>action(ticket.id,"finish",{paymentMethod:"Tunai",confirmed:"on",collectedBy:"Test"}),/Ready/);
 await assert.rejects(()=>action(ticket.id,"process",{diagnosis:"test",plannedWork:"test",estimate:200000}),/foto/);
 await action(ticket.id,"process",{diagnosis:"LCD rusak",plannedWork:"Ganti LCD",estimate:200000,approved:"on"},true);
 const qc=Object.fromEntries(qualityChecks.map((_,i)=>[`check${i}`,"Lulus"]));
 await assert.rejects(()=>action(ticket.id,"ready",{evaluation:"Test hasil",serviceCost:250000,warrantyDays:7,...qc},true),/persetujuan/);
 await action(ticket.id,"ready",{evaluation:"LCD berfungsi",serviceCost:150000,warrantyDays:7,...qc},true);
 const ready=await prisma.teknisiTicket.findUniqueOrThrow({where:{id:ticket.id}});assert.equal(ready.paidAmount,0);assert.equal(ready.paidAt,null);
 const payment=form({ticketId:ticket.id,operation:"finish",expectedVersion:ready.updatedAt.toISOString(),paymentMethod:"Tunai",collectedBy:"TEST",confirmed:"on"});
 const results=await Promise.allSettled([advanceService(actor,payment),advanceService(actor,payment)]);
 assert.equal(results.filter(result=>result.status==="fulfilled").length,1);
 const finish=await prisma.teknisiTicket.findUniqueOrThrow({where:{id:ticket.id}});assert.equal(finish.status,"collected");assert.equal(finish.paidAmount,150000);assert.ok(finish.paidAt);
 assert.equal(await prisma.teknisiEvent.count({where:{ticketId:ticket.id,status:"collected"}}),1);
 assert.equal(await prisma.teknisiPhoto.count({where:{ticketId:ticket.id}}),3);
 await assert.rejects(()=>action(ticket.id,"correction",{serviceCost:140000,note:"TEST correction",confirmed:"on"}),/pengelola/);
 const manager={...actor,role:"admin",canManage:true};
 await advanceService(manager,form({ticketId:ticket.id,operation:"correction",expectedVersion:finish.updatedAt.toISOString(),serviceCost:140000,note:"TEST correction",confirmed:"on"}));
 assert.equal((await prisma.teknisiTicket.findUniqueOrThrow({where:{id:ticket.id}})).paidAmount,140000);
 assert.equal(await prisma.teknisiEvent.count({where:{ticketId:ticket.id,note:{startsWith:"KOREKSI TRANSAKSI"}}}),1);
 const failed=await createTicket(actor,form({outletId:outlet.id,customerName:"TEST FAILED",customerPhone:"000",device:"TEST DEVICE",complaint:"TEST FAILED",priority:"normal",estimate:30000,dueAt:"2030-01-01"},true));
 await assert.rejects(()=>action(failed.id,"cancel",{note:"Unable to repair",handover:"Device intact",cancellationFee:20000},true),/disetujui/);
 await action(failed.id,"cancel",{note:"Unable to repair",handover:"Device intact",cancellationFee:20000,approved:"on"},true);
 const failedReady=await prisma.teknisiTicket.findUniqueOrThrow({where:{id:failed.id}});assert.equal(failedReady.status,"ready");assert.equal(failedReady.outcome,"failed");assert.equal(failedReady.paidAmount,0);
 await action(failed.id,"finish",{paymentMethod:"Tunai",collectedBy:"TEST",confirmed:"on"});assert.equal((await prisma.teknisiTicket.findUniqueOrThrow({where:{id:failed.id}})).paidAmount,20000);
 console.log("PASS: lifecycle, private photos, outlet isolation, approvals, final price, frozen Ready, and single payment.");
}finally{
 const ticketIds=(await prisma.teknisiTicket.findMany({where:{outletId:outlet.id},select:{id:true}})).map(t=>t.id);
 await prisma.$transaction(async tx=>{
  await tx.teknisiPhoto.deleteMany({where:{ticketId:{in:ticketIds}}});await tx.teknisiEvent.deleteMany({where:{ticketId:{in:ticketIds}}});
  await tx.teknisiTicket.deleteMany({where:{id:{in:ticketIds}}});
  await tx.teknisiTechnician.delete({where:{id:tech.id}});await tx.teknisiOutlet.delete({where:{id:outlet.id}});await tx.teknisiOutlet.delete({where:{id:other.id}});
 });await prisma.$disconnect();
}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
