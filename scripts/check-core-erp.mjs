import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import mariadb from "mariadb";
import nextEnv from "@next/env";
import { SignJWT } from "jose";
nextEnv.loadEnvConfig(process.cwd());
const base = new URL(process.env.ERP_TEST_URL ?? "http://localhost:3001");
const url = new URL(process.env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && ["localhost", "127.0.0.1"].includes(base.hostname));
const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), timezone: "+00:00" });
const marker = `ERP fixture ${randomUUID()}`, donorId = randomUUID(), beneficiaryId = randomUUID(), otherId = randomUUID(), paymentId = randomUUID();
const reference = `ERP-${randomUUID()}`, today = new Date(Date.now()+7*3600000).toISOString().slice(0,10);
const phone = "628"+Date.now().toString().slice(-10), email = randomUUID()+"@erp-test.invalid";
const normalize = text => text.replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
let newBackupId;
const temporaryContactIds = new Set();
async function cookie(user, claims = {}) {
  return "sip_session="+await new SignJWT({ userId: user.id, name: user.name, isSuperadmin: !!user.is_superadmin, moduleSlugs: [], ...claims }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(process.env.SESSION_SECRET));
}
async function get(route, session = "") { return fetch(new URL(route,base), { headers: { Cookie: session }, redirect: "manual" }); }
async function rendered(route, session) {
  const response = await get(route, session), html = await response.text();
  assert.equal(response.status,200,route); assert.ok(!html.includes('data-msg=') && !html.includes('NEXT_REDIRECT'),route); return html;
}
async function action(route, session, select, values = {}) {
  const html = await rendered(route,session);
  const form = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map(m => m[0]).find(select);
  assert.ok(form, `form ${route}`);
  const data = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/\bname="([^"]+)"/)?.[1];
    if (name?.startsWith("$ACTION_")) data.append(normalize(name),normalize(match[0].match(/\bvalue="([^"]*)"/)?.[1] ?? ""));
  }
  for (const [key,value] of Object.entries(values)) data.set(key, value instanceof File ? value : String(value));
  const response = await fetch(new URL(route,base), { method: "POST", body: data, headers: { Cookie: session, Origin: base.origin }, redirect: "manual" });
  assert.ok([200,303].includes(response.status)); return response.text();
}
try {
  const admin = (await db.query("SELECT * FROM users WHERE is_active=TRUE AND is_superadmin=TRUE LIMIT 1"))[0];
  const student = (await db.query("SELECT * FROM users WHERE is_active=TRUE AND is_superadmin=FALSE LIMIT 1"))[0];
  assert.ok(admin && student);
  const adminCookie = await cookie(admin), studentCookie = await cookie(student), forgedCookie = await cookie(student,{isSuperadmin:true});
  for (const route of ["/admin/super", "/admin/super/kontak", "/admin/super/keuangan", "/admin/super/backup"]) {
    await rendered(route,adminCookie); assert.equal((await get(route,studentCookie)).status,307);
    assert.equal((await get(route,forgedCookie)).status,307);
  }
  assert.equal((await get("/api/super/erp/export?type=bank-template")).status,403);
  assert.equal((await get("/api/super/erp/export?type=bank-template",studentCookie)).status,403);
  assert.equal((await get("/api/super/erp/export?type=bank-template",forgedCookie)).status,403);
  const createdBackup = await action("/admin/super/backup",adminCookie,f => f.includes("Buat backup sekarang"));
  assert.ok(createdBackup.includes("Backup selesai"), "UI backup creation reports success");
  const account = (await db.query("SELECT * FROM payment_destination_accounts LIMIT 1"))[0]; assert.ok(account);
  await db.query("INSERT INTO payment_donors (id,name,phone,email) VALUES (?,?,?,?)",[donorId,marker,phone,email]);
  await db.query("INSERT INTO sarsip_beneficiaries (id,name,phone,location,assistance,received_at,updated_at) VALUES (?,?,?,?,?,?,?),(?,?,?,?,?,?,?)",[beneficiaryId,marker,"0"+phone.slice(2),"Fixture","Fixture",new Date(),new Date(),otherId,marker+" other",phone,"Fixture","Fixture",new Date(),new Date()]);
  await action("/admin/super/kontak",adminCookie,f => f.includes("Sinkronkan dari semua modul"));
  let sources = await db.query("SELECT * FROM core_contact_sources WHERE source_id IN (?,?,?)",[donorId,beneficiaryId,otherId]); assert.equal(sources.length,3);
  const target = sources.find(s => s.source_id === donorId).contact_id, duplicate = sources.find(s => s.source_id === otherId).contact_id;
  temporaryContactIds.add(target); temporaryContactIds.add(duplicate);
  assert.equal(target,sources.find(s => s.source_id === beneficiaryId).contact_id); assert.notEqual(target,duplicate);
  await action("/admin/super/kontak",adminCookie,f => f.includes("Sinkronkan dari semua modul"));
  assert.equal((await db.query("SELECT COUNT(*) AS n FROM core_contact_sources WHERE source_id IN (?,?,?)",[donorId,beneficiaryId,otherId]))[0].n,3n);
  await action("/admin/super/kontak?q="+encodeURIComponent(marker),adminCookie,f => f.includes("Gabungkan kontak"),{target,source:duplicate,confirm:"yes"});
  sources = await db.query("SELECT * FROM core_contact_sources WHERE source_id IN (?,?,?)",[donorId,beneficiaryId,otherId]); assert.ok(sources.every(s => s.contact_id === target));
  assert.equal((await db.query("SELECT COUNT(*) AS n FROM payment_donors WHERE id=?",[donorId]))[0].n,1n);
  console.log("PASS: live DB superadmin authorization; contact normalization, repeated sync, shared-phone separation and manual merge without modifying source records");
  await action("/admin/super/keuangan",adminCookie,f => f.includes("Simpan pengeluaran"),{accountId:account.id,reference,description:marker,amount:125000,spentAt:today});
  const expense = (await db.query("SELECT * FROM core_expenses WHERE reference=?",[reference]))[0]; assert.equal(expense.amount,125000);
  await db.query("INSERT INTO payment_transactions (id,tracking_code,module_source,source_type,source_id,fund_type,donor_id,amount,admin_fee,payment_method,destination_account_id,status,gateway,paid_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'paid','manual',?)",[paymentId,reference+"-P",account.module_source,"campaign",randomUUID(),account.fund_type,donorId,75000,2500,"bank_transfer",account.id,new Date()]);
  const csv = `tanggal,referensi,keterangan,arah,nominal\n${today},${reference}-OUT,${marker},keluar,125000\n${today},${reference}-IN,${marker},masuk,77500\n`;
  const values = {accountId:account.id,file:new File([csv],"fixture.csv",{type:"text/csv"})};
  await action("/admin/super/keuangan",adminCookie,f => f.includes("Impor mutasi"),values);
  await action("/admin/super/keuangan",adminCookie,f => f.includes("Impor mutasi"),values);
  let lines = await db.query("SELECT * FROM core_bank_lines WHERE reference IN (?,?)",[reference+"-OUT",reference+"-IN"]); assert.equal(lines.length,2);
  const incoming = lines.find(l => l.direction === "masuk"), outgoing = lines.find(l => l.direction === "keluar");
  await action("/admin/super/keuangan",adminCookie,f => f.includes("Konfirmasi cocok"),{lineId:incoming.id,entryId:expense.id,note:"Wrong direction check"});
  assert.equal((await db.query("SELECT payment_id FROM core_bank_lines WHERE id=?",[incoming.id]))[0].payment_id,null);
  await db.query("UPDATE payment_transactions SET gateway='simulation' WHERE id=?",[paymentId]);
  await action("/admin/super/keuangan",adminCookie,f => f.includes("Konfirmasi cocok"),{lineId:incoming.id,entryId:paymentId,note:"Simulation cannot reconcile"});
  assert.equal((await db.query("SELECT payment_id FROM core_bank_lines WHERE id=?",[incoming.id]))[0].payment_id,null);
  const simulatedExport = await get(`/api/super/erp/export?type=finance&from=${today}&to=${today}`,adminCookie);
  assert.ok(!(await simulatedExport.text()).includes(reference+"-P"));
  await db.query("UPDATE payment_transactions SET gateway='manual' WHERE id=?",[paymentId]);
  await action("/admin/super/keuangan",adminCookie,f => f.includes("Konfirmasi cocok"),{lineId:incoming.id,entryId:paymentId,note:"Verified fixture incoming"});
  await action("/admin/super/keuangan",adminCookie,f => f.includes("Konfirmasi cocok"),{lineId:outgoing.id,entryId:expense.id,note:"Verified fixture outgoing"});
  lines = await db.query("SELECT * FROM core_bank_lines WHERE reference IN (?,?)",[reference+"-OUT",reference+"-IN"]);
  assert.equal(lines.find(l => l.id === incoming.id).payment_id,paymentId); assert.equal(lines.find(l => l.id === outgoing.id).expense_id,expense.id);
  await action("/admin/super/keuangan",adminCookie,f => f.includes(">Batalkan<"),{lineId:incoming.id,note:"Fixture undo"});
  assert.equal((await db.query("SELECT payment_id FROM core_bank_lines WHERE id=?",[incoming.id]))[0].payment_id,null);
  const exported = await get(`/api/super/erp/export?type=finance&from=${today}&to=${today}`,adminCookie); assert.equal(exported.status,200); assert.ok((await exported.text()).includes(reference));
  console.log("PASS: expense recording, atomic CSV import/deduplication, wrong match rejection, income+fee/expense matching, undo and financial export");
  const overview = await rendered("/admin/super",adminCookie); assert.ok(overview.includes("Operasional lintas modul") && overview.includes("Mutasi bank belum cocok"));
  // Existing valid backup contains no temporary fixture data.
  const backupNames = (await fs.readdir(path.resolve(process.env.ERP_BACKUP_DIR ?? ".erp-backups"))).filter(n => n.endsWith(".sipbak")).sort();
  newBackupId = backupNames.at(-1); assert.ok(newBackupId);
  const downloaded = await get("/api/super/erp/backup/"+newBackupId,adminCookie); assert.equal(downloaded.status,200); assert.equal(Buffer.from(await downloaded.arrayBuffer()).subarray(0,8).toString(),"SIPBAK01");
  assert.equal((await get("/api/super/erp/backup/"+newBackupId,studentCookie)).status,403);
  const verifiedBackup = await action("/admin/super/backup",adminCookie,f => f.includes("Verifikasi integritas"),{id:newBackupId});
  assert.ok(verifiedBackup.includes("Integritas valid"), "UI backup verification reports success");
  console.log("PASS: operational dashboard, private encrypted backup download and UI verification");
} finally {
  await db.query("DELETE FROM core_bank_lines WHERE reference IN (?,?)",[reference+"-OUT",reference+"-IN"]);
  await db.query("DELETE FROM core_expenses WHERE reference=?",[reference]);
  await db.query("DELETE FROM payment_transactions WHERE id=?",[paymentId]);
  const contacts = await db.query("SELECT DISTINCT contact_id FROM core_contact_sources WHERE source_id IN (?,?,?)",[donorId,beneficiaryId,otherId]);
  await db.query("DELETE FROM core_contact_sources WHERE source_id IN (?,?,?)",[donorId,beneficiaryId,otherId]);
  for (const c of contacts) await db.query("DELETE FROM core_contacts WHERE id=? AND NOT EXISTS (SELECT 1 FROM core_contact_sources WHERE contact_id=?)",[c.contact_id,c.contact_id]);
  await db.query("DELETE FROM sarsip_beneficiaries WHERE id IN (?,?)",[beneficiaryId,otherId]);
  await db.query("DELETE FROM payment_donors WHERE id=?",[donorId]);
  // Remove only temporary test audit messages, identified by UUID markers/references.
  await db.query("DELETE FROM access_logs WHERE message LIKE ? OR message LIKE ?",["%"+marker+"%","%"+reference+"%"]);
  for (const id of temporaryContactIds) await db.query("DELETE FROM access_logs WHERE message LIKE ? AND message LIKE '%menggabungkan kontak%'",["%"+id+"%"]);
  await db.end();
}
