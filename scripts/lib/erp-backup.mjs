import fs from "node:fs/promises";
import path from "node:path";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import mariadb from "mariadb";
export const backupRoot = path.resolve(process.env.ERP_BACKUP_DIR ?? ".erp-backups");
const keyPath = path.join(backupRoot, "backup-key.local");
const maxBytes = 256 * 1024 * 1024;
const hash = data => createHash("sha256").update(data).digest("hex");
export const validBackupId = id => /^erp-\d{8}T\d{9}Z-[a-f0-9]{8}\.sipbak$/.test(id);
const quote = value => "`" + value.replace(/`/g, "``") + "`";
async function connect(urlString) {
  const url = new URL(urlString);
  return mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), timezone: "+00:00", bigIntAsNumber: false, decimalAsNumber: false });
}
async function key(create = false) {
  if (process.env.ERP_BACKUP_KEY) {
    if (!/^[a-f0-9]{64}$/i.test(process.env.ERP_BACKUP_KEY)) throw new Error("ERP_BACKUP_KEY harus 64 karakter hex.");
    return Buffer.from(process.env.ERP_BACKUP_KEY, "hex");
  }
  await fs.mkdir(backupRoot, { recursive: true, mode: 0o700 });
  if (create) { try { await fs.writeFile(keyPath, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 }); } catch (e) { if (e.code !== "EEXIST") throw e; } }
  const value = (await fs.readFile(keyPath, "utf8")).trim();
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("Kunci backup tidak valid.");
  return Buffer.from(value, "hex");
}
const encode = value => value === null ? null : value instanceof Date ? { type: "date", value: value.toISOString() } : typeof value === "bigint" ? { type: "bigint", value: value.toString() } : Buffer.isBuffer(value) ? { type: "buffer", value: value.toString("base64") } : value;
const decode = value => value && typeof value === "object" ? value.type === "date" ? new Date(value.value) : value.type === "bigint" ? BigInt(value.value) : value.type === "buffer" ? Buffer.from(value.value, "base64") : value : value;
async function captureFiles(root, label, result, budget) {
  const walk = async (directory, relative = "") => {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const name = relative ? relative + "/" + entry.name : entry.name;
      const full = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Upload symlink tidak didukung pada backup.");
      if (entry.isDirectory()) await walk(full, name);
      else if (entry.isFile()) {
        const before = await fs.stat(full); budget.bytes += before.size;
        if (budget.bytes > maxBytes) throw new Error("Backup melebihi 256 MB. Gunakan backup infrastruktur untuk dataset besar.");
        const data = await fs.readFile(full), after = await fs.stat(full);
        if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error("File upload berubah saat backup. Ulangi saat aktivitas upload berhenti.");
        result.push({ root: label, path: name, sha256: hash(data), size: data.length, data: data.toString("base64") });
      }
    }
  };
  try { await walk(root); } catch (e) { if (e.code !== "ENOENT") throw e; }
}
export async function createBackup() {
  await fs.mkdir(backupRoot, { recursive: true, mode: 0o700 });
  const lock = path.join(backupRoot, "create.lock");
  let handle;
  try { handle = await fs.open(lock, "wx"); } catch { throw new Error("Backup lain sedang berjalan. Jika proses sebelumnya terhenti, periksa create.lock di server."); }
  let db;
  try {
    db = await connect(process.env.DATABASE_URL);
    const tables = await db.query("SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
    if (tables.some(t => t.engine !== "InnoDB")) throw new Error("Backup konsisten memerlukan seluruh tabel InnoDB.");
    await db.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await db.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
    const snapshot = { version: 1, createdAt: new Date().toISOString(), tables: [], files: [] };
    let size = 0;
    for (const table of tables) {
      const ddl = await db.query(`SHOW CREATE TABLE ${quote(table.name)}`);
      const rows = await db.query(`SELECT * FROM ${quote(table.name)}`);
      const columns = (await db.query(`SHOW COLUMNS FROM ${quote(table.name)}`)).map(c => c.Field);
      const data = rows.map(r => columns.map(c => encode(r[c])));
      size += Buffer.byteLength(JSON.stringify(data));
      if (size > maxBytes) throw new Error("Database melebihi batas backup aplikasi 256 MB.");
      snapshot.tables.push({ name: table.name, ddl: ddl[0]["Create Table"], columns, rows: data });
    }
    const budget = { bytes: size };
    await captureFiles(path.resolve(process.env.ACADEMY_UPLOAD_DIR ?? ".academy-uploads"), "academy", snapshot.files, budget);
    await captureFiles(path.resolve("public/uploads"), "public", snapshot.files, budget);
    await db.commit();
    const raw = Buffer.from(JSON.stringify(snapshot));
    if (raw.length > maxBytes) throw new Error("Ukuran snapshot melebihi batas 256 MB.");
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", await key(true), iv);
    const encrypted = Buffer.concat([cipher.update(gzipSync(raw)), cipher.final()]);
    const output = Buffer.concat([Buffer.from("SIPBAK01"), iv, cipher.getAuthTag(), encrypted]);
    const id = `erp-${snapshot.createdAt.replace(/[-:.]/g, "")}-${randomBytes(4).toString("hex")}.sipbak`;
    await fs.writeFile(path.join(backupRoot, id), output, { flag: "wx", mode: 0o600 });
    return { id, createdAt: snapshot.createdAt, size: output.length, tables: snapshot.tables.length, rows: snapshot.tables.reduce((n,t) => n+t.rows.length,0), files: snapshot.files.length, sha256: hash(output) };
  } finally { if (db) await db.end(); await handle.close(); await fs.unlink(lock).catch(() => {}); }
}
export async function readBackup(id) {
  if (!validBackupId(id)) throw new Error("ID backup tidak valid.");
  const data = await fs.readFile(path.join(backupRoot, id));
  if (data.length > maxBytes || data.subarray(0,8).toString() !== "SIPBAK01") throw new Error("Format backup tidak valid.");
  const decipher = createDecipheriv("aes-256-gcm", await key(), data.subarray(8,20));
  decipher.setAuthTag(data.subarray(20,36));
  const raw = gunzipSync(Buffer.concat([decipher.update(data.subarray(36)), decipher.final()]), { maxOutputLength: maxBytes });
  const snapshot = JSON.parse(raw.toString());
  if (snapshot.version !== 1 || !Array.isArray(snapshot.tables) || !Array.isArray(snapshot.files)) throw new Error("Snapshot tidak valid.");
  for (const file of snapshot.files) {
    if (!["academy", "public"].includes(file.root) || !file.path || file.path.includes("\\") || file.path.split("/").some(p => !p || p === "." || p === "..") || path.isAbsolute(file.path)) throw new Error("Path file backup tidak valid.");
    const bytes = Buffer.from(file.data, "base64");
    if (hash(bytes) !== file.sha256 || bytes.length !== file.size) throw new Error("Checksum file tidak cocok.");
  }
  for (const table of snapshot.tables) {
    if (!/^[A-Za-z0-9_]+$/.test(table.name) || !Array.isArray(table.columns) || table.columns.some(c => !/^[A-Za-z0-9_]+$/.test(c)) || !Array.isArray(table.rows) || table.rows.some(r => !Array.isArray(r) || r.length !== table.columns.length)) throw new Error("Tabel backup tidak valid.");
  }
  return snapshot;
}
export async function listBackups() {
  try {
    const names = (await fs.readdir(backupRoot)).filter(validBackupId).sort().reverse();
    return Promise.all(names.map(async id => { const stat = await fs.stat(path.join(backupRoot, id)); return { id, size: stat.size, createdAt: stat.mtime.toISOString() }; }));
  } catch (e) { if (e.code === "ENOENT") return []; throw e; }
}
export async function verifyBackup(id) {
  const snapshot = await readBackup(id);
  return { id, createdAt: snapshot.createdAt, tables: snapshot.tables.length, rows: snapshot.tables.reduce((n,t) => n+t.rows.length,0), files: snapshot.files.length };
}
export async function restoreBackup(id, targetUrl, filesDirectory) {
  if (!targetUrl || !filesDirectory) throw new Error("Target database dan folder pemulihan wajib diisi.");
  const source = new URL(process.env.DATABASE_URL), target = new URL(targetUrl);
  const localHost = h => ["localhost", "127.0.0.1", "[::1]"].includes(h) ? "local" : h;
  if (source.pathname === target.pathname && localHost(source.hostname) === localHost(target.hostname) && (source.port || "3306") === (target.port || "3306")) throw new Error("Pemulihan ke database aktif ditolak.");
  const snapshot = await readBackup(id);
  const root = path.resolve(filesDirectory);
  try { if ((await fs.readdir(root)).length) throw new Error("Folder pemulihan harus kosong."); } catch (e) { if (e.code !== "ENOENT") throw e; }
  const db = await connect(targetUrl);
  try {
    const tables = await db.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()");
    if (Number(tables[0].n) !== 0) throw new Error("Database target harus kosong. Tidak ada data yang ditimpa.");
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    await db.query("SET FOREIGN_KEY_CHECKS=0");
    for (const table of snapshot.tables) await db.query(table.ddl);
    await db.beginTransaction();
    for (const table of snapshot.tables) for (const row of table.rows) await db.query(`INSERT INTO ${quote(table.name)} (${table.columns.map(quote).join(",")}) VALUES (${row.map(() => "?").join(",")})`, row.map(decode));
    await db.commit();
    await db.query("SET FOREIGN_KEY_CHECKS=1");
    for (const table of snapshot.tables) {
      const count = await db.query(`SELECT COUNT(*) AS n FROM ${quote(table.name)}`);
      if (Number(count[0].n) !== table.rows.length) throw new Error("Jumlah baris pemulihan berbeda.");
    }
    for (const file of snapshot.files) {
      const full = path.join(root, file.root, ...file.path.split("/"));
      await fs.mkdir(path.dirname(full), { recursive: true, mode: 0o700 });
      await fs.writeFile(full, Buffer.from(file.data, "base64"), { flag: "wx", mode: 0o600 });
    }
    return { tables: snapshot.tables.length, files: snapshot.files.length };
  } catch (e) { await db.rollback().catch(() => {}); throw new Error(`Pemulihan gagal: ${e.message}. Target mungkin berisi tabel parsial; database sumber tidak diubah.`); }
  finally { await db.end(); }
}
