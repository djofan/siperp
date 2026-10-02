import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import mariadb from "mariadb";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

const migrationName = "20260921073434_add_academy_module";
const migrationPath = path.join(process.cwd(), "prisma", "migrations", migrationName, "migration.sql");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const connection = await mariadb.createConnection({
    host: url.hostname, port: Number(url.port || 3306),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  });
  try {
    const sql = fs.readFileSync(migrationPath, "utf8");
    const statements = sql.replace(/^--.*$/gm, "").split(";").map(value => value.trim()).filter(Boolean);
    // This setup may only add academy tables and their foreign keys.
    if (statements.some(statement => !/^(CREATE TABLE `zakat_academy_\w+`|ALTER TABLE `zakat_academy_\w+` ADD CONSTRAINT)/.test(statement))) {
      throw new Error("Migrasi memuat perubahan di luar tabel academy.");
    }
    const expected = [...sql.matchAll(/CREATE TABLE `(zakat_academy_\w+)`/g)].map(match => match[1]);
    const tables = await connection.query("SHOW TABLES");
    const names = new Set(tables.map(row => Object.values(row)[0]));
    const history = await connection.query(
      "SELECT finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = ?", [migrationName],
    );
    const applied = history.some(row => row.finished_at && !row.rolled_back_at);
    if (!applied) {
      if (history.length || expected.some(table => names.has(table))) {
        throw new Error("Migrasi academy belum tercatat selesai tetapi tabel/riwayat sudah ada. Periksa kondisi parsial sebelum melanjutkan.");
      }
      for (const statement of statements) await connection.query(statement);
      console.log(`${expected.length} tabel academy dibuat.`);
      const resolved = spawnSync(process.execPath, [
        path.join(process.cwd(), "node_modules/prisma/build/index.js"),
        "migrate", "resolve", "--applied", migrationName,
      ], { stdio: "inherit", env: process.env });
      if (resolved.status !== 0) throw new Error("Tabel telah dibuat, tetapi pencatatan migrasi Prisma belum berhasil.");
    } else {
      if (expected.some(table => !names.has(table))) throw new Error("Riwayat migrasi academy tidak cocok dengan tabel database.");
      console.log("Migrasi academy sudah diterapkan.");
    }
    await connection.query(
      "INSERT INTO modules (id, slug, name, description, is_active) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE slug = VALUES(slug)",
      [randomUUID(), "academy", "Zakat Academy", "Platform belajar Islami berbasis video untuk LAZSIP", true],
    );
    await connection.query(
      "INSERT INTO zakat_academy_settings (id, `key`, value, updated_at) VALUES (?, ?, ?, NOW(3)) ON DUPLICATE KEY UPDATE `key` = VALUES(`key`)",
      [randomUUID(), "maintenance_mode", "false"],
    );
    const academyModule = await connection.query("SELECT slug, is_active FROM modules WHERE slug = ?", ["academy"]);
    const setting = await connection.query("SELECT value FROM zakat_academy_settings WHERE `key` = ?", ["maintenance_mode"]);
    console.log(JSON.stringify({ database: url.pathname.slice(1), tables: expected.length, active: !!academyModule[0].is_active, maintenance: setting[0].value === "true" }));
  } finally {
    await connection.end();
  }
}
main().catch(error => {
  console.error(error.code || error.message);
  process.exitCode = 1;
});
