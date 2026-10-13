import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import mariadb from "mariadb";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const migration = "20261008093000_teknisi_hp";
const url = new URL(process.env.DATABASE_URL);
const database = decodeURIComponent(url.pathname.slice(1));
const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database });
try {
  const applied = await db.query("SELECT finished_at FROM _prisma_migrations WHERE migration_name=? AND rolled_back_at IS NULL", [migration]);
  if (!applied.some(row => row.finished_at)) {
    const existing = await db.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME LIKE 'teknisi\\_%'", [database]);
    if (existing.length) throw new Error("Tabel teknisi sudah ada tetapi migrasi belum tercatat. Verifikasi struktur sebelum melanjutkan; skrip tidak menimpa tabel yang ada.");
    const sql = await fs.readFile(`prisma/migrations/${migration}/migration.sql`, "utf8");
    for (const statement of sql.split(";").map(statement => statement.trim()).filter(Boolean)) await db.query(statement);
    const resolved = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "resolve", "--applied", migration], { stdio: "inherit" });
    if (resolved.status !== 0) throw new Error("Tabel dibuat, tetapi migrasi belum tercatat. Jalankan prisma migrate resolve --applied setelah memverifikasi struktur.");
  }
  await db.query("INSERT INTO modules (id, slug, name, description, is_active) VALUES (?, 'teknisi', 'Teknisi HP', ?, true) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description)", ["module_teknisi_hp", "Pengelolaan outlet, tiket servis HP, teknisi, sparepart, dan monitoring."]);
  const generated = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "generate"], { stdio: "inherit" });
  if (generated.status !== 0) throw new Error("Prisma Client belum berhasil diperbarui.");
  console.log("Modul Teknisi HP siap. Buka /admin/teknisi menggunakan akun SIP.");
} finally { await db.end(); }
