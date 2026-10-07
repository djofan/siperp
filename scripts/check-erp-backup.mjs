import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes, createHash } from "node:crypto";
import mariadb from "mariadb";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { createBackup, readBackup, verifyBackup, restoreBackup, backupRoot } = await import("./lib/erp-backup.mjs");
const source = new URL(process.env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(source.hostname), "Restore check is local only");
const db = await mariadb.createConnection({ host: source.hostname, port: Number(source.port || 3306), user: decodeURIComponent(source.username), password: decodeURIComponent(source.password), database: source.pathname.slice(1), timezone: "+00:00" });
const targetName = "erp_restore_test_" + randomBytes(6).toString("hex");
const targetUrl = new URL(source); targetUrl.pathname = "/"+targetName;
const directory = path.resolve(".erp-restore-test", targetName);
let created = false, badId;
try {
  const backup = await createBackup(), snapshot = await readBackup(backup.id);
  const summary = await verifyBackup(backup.id);
  assert.equal(summary.tables, snapshot.tables.length);
  const data = await fs.readFile(path.join(backupRoot, backup.id));
  badId = backup.id.replace(/-[a-f0-9]{8}\.sipbak$/, "-"+randomBytes(4).toString("hex")+".sipbak");
  data[data.length-1] ^= 1;
  await fs.writeFile(path.join(backupRoot, badId), data, { flag: "wx" });
  await assert.rejects(() => verifyBackup(badId));
  await assert.rejects(() => restoreBackup(backup.id, source.toString(), directory), /database aktif/);
  await db.query(`CREATE DATABASE \`${targetName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); created = true;
  await restoreBackup(backup.id, targetUrl.toString(), directory);
  const restored = await mariadb.createConnection({ host: source.hostname, port: Number(source.port || 3306), user: decodeURIComponent(source.username), password: decodeURIComponent(source.password), database: targetName, timezone: "+00:00" });
  try {
    for (const table of snapshot.tables) {
      const count = await restored.query(`SELECT COUNT(*) AS n FROM \`${table.name}\``);
      assert.equal(Number(count[0].n), table.rows.length, table.name);
      const rows = await restored.query(`SELECT * FROM \`${table.name}\``);
      const encode = v => v === null ? null : v instanceof Date ? {type:"date",value:v.toISOString()} : typeof v === "bigint" ? {type:"bigint",value:v.toString()} : Buffer.isBuffer(v) ? {type:"buffer",value:v.toString("base64")} : v;
      const values = rows.map(row => JSON.stringify(table.columns.map(column => encode(row[column])))).sort();
      assert.deepEqual(values,table.rows.map(row => JSON.stringify(row)).sort(), `restored values ${table.name}`);
    }
    for (const file of snapshot.files) {
      const contents = await fs.readFile(path.join(directory,file.root,...file.path.split("/")));
      assert.equal(createHash("sha256").update(contents).digest("hex"), file.sha256);
    }
    await assert.rejects(() => restoreBackup(backup.id, targetUrl.toString(), path.join(directory,"second")), /Database target harus kosong/);
  } finally { await restored.end(); }
  console.log(`PASS: encrypted backup ${summary.tables} tables/${summary.rows} rows/${summary.files} files; tamper rejection, active/nonempty target rejection, full empty-database restore and file checksums`);
} finally {
  if (badId) await fs.unlink(path.join(backupRoot,badId)).catch(() => {});
  if (created) { assert.match(targetName,/^erp_restore_test_[a-f0-9]{12}$/); await db.query(`DROP DATABASE \`${targetName}\``); }
  assert.ok(directory.startsWith(path.resolve(".erp-restore-test")+path.sep));
  await fs.rm(directory, { recursive: true, force: true });
  await db.end();
}
