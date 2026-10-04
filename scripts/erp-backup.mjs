import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { createBackup, verifyBackup, restoreBackup, listBackups } = await import("./lib/erp-backup.mjs");
const [command, id] = process.argv.slice(2);
try {
  let result;
  if (command === "create") result = await createBackup();
  else if (command === "list") result = await listBackups();
  else if (command === "verify") result = await verifyBackup(id);
  else if (command === "restore" && process.argv.includes("--confirm-empty-target")) {
    const filesIndex = process.argv.indexOf("--files-dir");
    result = await restoreBackup(id, process.env.ERP_RESTORE_DATABASE_URL, filesIndex >= 0 ? process.argv[filesIndex+1] : null);
  } else throw new Error("Gunakan create | list | verify <id> | restore <id> --confirm-empty-target --files-dir <folder-kosong>. Target melalui ERP_RESTORE_DATABASE_URL.");
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
