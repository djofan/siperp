import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import mariadb from "mariadb";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const migration = "20261002090000_core_erp";
const url = new URL(process.env.DATABASE_URL);
const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
try {
  const applied = await db.query("SELECT finished_at FROM _prisma_migrations WHERE migration_name=? AND rolled_back_at IS NULL", [migration]);
  if (!applied.some(row => row.finished_at)) {
    const sql = await fs.readFile(`prisma/migrations/${migration}/migration.sql`, "utf8");
    for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) await db.query(statement);
    const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "resolve", "--applied", migration], { stdio: "inherit" });
    if (result.status !== 0) throw new Error("Migrasi belum tercatat.");
  }
  console.log("Database Core ERP siap.");
} finally { await db.end(); }
