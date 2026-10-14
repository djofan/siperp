import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(path.resolve('package.json'));
require('dotenv').config({ quiet: true });
const source = new URL(process.env.DATABASE_URL);
if (source.pathname !== '/sipmodular_db' || !['localhost','127.0.0.1'].includes(source.hostname)) throw Error('Expected local sipmodular_db source');
const mysql = require('mariadb');
const db = await mysql.createConnection({host:source.hostname,port:Number(source.port||3306),user:decodeURIComponent(source.username),password:decodeURIComponent(source.password)});
const exists = await db.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='sipmodular_laravel_dev'");
if(exists.length) throw Error('Target already exists; refusing overwrite');
const bin='C:/laragon/bin/mysql/mysql-8.4.3-winx64/bin';
const cnf=path.resolve('api/storage/app/clone.local.cnf'), dump=path.resolve('api/storage/app/clone.local.sql');
const pwd=decodeURIComponent(source.password).replaceAll('\\','\\\\').replaceAll('"','\\"');
fs.writeFileSync(cnf,`[client]\nhost=${source.hostname}\nport=${source.port||3306}\nuser=${decodeURIComponent(source.username)}\npassword="${pwd}"\n`);
try {
let p=spawnSync(`${bin}/mysqldump.exe`,[`--defaults-extra-file=${cnf}`,'--single-transaction','--no-tablespaces','--set-gtid-purged=OFF',`--result-file=${dump}`,'sipmodular_db'],{encoding:'utf8'});if(p.status!==0)throw Error(p.stderr);
await db.query('CREATE DATABASE sipmodular_laravel_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
p=spawnSync(`${bin}/mysql.exe`,[`--defaults-extra-file=${cnf}`,'sipmodular_laravel_dev'],{input:fs.readFileSync(dump),maxBuffer:64*1024*1024});if(p.status!==0)throw Error(p.stderr.toString());
const env=`APP_NAME=SiperpApi\nAPP_ENV=local\nAPP_KEY=\nAPP_DEBUG=false\nAPP_URL=http://localhost:8000\nAPP_TIMEZONE=UTC\nDB_CONNECTION=mysql\nDB_HOST=${source.hostname}\nDB_PORT=${source.port||3306}\nDB_DATABASE=sipmodular_laravel_dev\nDB_USERNAME=${decodeURIComponent(source.username)}\nDB_PASSWORD="${pwd}"\nDB_TIMEZONE=+00:00\nSESSION_DRIVER=file\nCACHE_STORE=file\nQUEUE_CONNECTION=sync\nHASH_VERIFY=false\nBCRYPT_ROUNDS=12\n`;
fs.writeFileSync('api/.env',env);
for(const table of ['users','modules','module_access','access_logs'])console.log(JSON.stringify({table,columns:await db.query(`DESCRIBE sipmodular_laravel_dev.${table}`)}));
console.log('Clone complete');
}finally{await db.end();for(const f of [cnf,dump])if(fs.existsSync(f))fs.unlinkSync(f);}
