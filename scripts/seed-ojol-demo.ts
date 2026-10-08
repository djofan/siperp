// Data demo Ojol Mengaji untuk pengujian manual di database LOKAL (lihat docs/ojol-demo.md).
//   npm run db:seed:ojol-demo            → buat akun & tugas contoh (aman dijalankan ulang)
//   npm run db:seed:ojol-demo -- --clean → hapus semua data demo
// Menolak berjalan pada database non-lokal atau NODE_ENV=production.
import { loadEnvConfig } from "@next/env";

const DEMO = "[Demo]";

async function main() {
  loadEnvConfig(process.cwd());
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || process.env.NODE_ENV === "production") {
    throw new Error("Seed demo Ojol hanya untuk database lokal pengembangan.");
  }
  const password = process.env.OJOL_DEMO_PASSWORD ?? "demo-ojol-2026";

  const { prisma } = await import("@/lib/prisma");
  const { createMember } = await import("@/modules/ojol/api/members");
  const { createGroup } = await import("@/modules/ojol/api/groups");
  const { createTask } = await import("@/modules/ojol/api/tasks");
  const { deleteUpload } = await import("@/modules/ojol/api/files");

  try {
    if (process.argv.includes("--clean")) {
      const members = await prisma.ojolMember.findMany({
        where: { user: { name: { startsWith: DEMO } } },
        select: { userId: true, photo: true, submissions: { select: { filePath: true } } },
      });
      await prisma.ojolTask.deleteMany({ where: { title: { startsWith: DEMO } } });
      await prisma.ojolGroup.deleteMany({ where: { name: { startsWith: DEMO } } });
      await prisma.user.deleteMany({ where: { id: { in: members.map((member) => member.userId) } } });
      await Promise.all(members.flatMap((member) => [deleteUpload(member.photo), ...member.submissions.map((row) => deleteUpload(row.filePath))]));
      console.log(`Data demo Ojol dihapus (${members.length} akun).`);
      return;
    }

    const existing = await prisma.ojolMember.findMany({
      where: { user: { name: { startsWith: DEMO } } },
      orderBy: { code: "asc" },
      select: { code: true, role: true, user: { select: { name: true } } },
    });
    if (existing.length) {
      console.log("Data demo sudah ada. Akun:");
      for (const member of existing) console.log(`  ${member.code}  ${member.role.padEnd(7)}  ${member.user.name}`);
      return;
    }

    const form = (entries: Record<string, string | string[]>) => {
      const data = new FormData();
      for (const [key, value] of Object.entries(entries)) for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
      return data;
    };
    const wib = (hours: number) => new Date(Date.now() + hours * 3_600_000 + 7 * 3_600_000).toISOString().slice(0, 16);

    const guru = await createMember("guru", form({ name: `${DEMO} Ustadz Hasan`, password, isActive: "on", phone: "081200000011", gender: "laki_laki" }));
    const musyrif = await createMember("guru", form({ name: `${DEMO} Ustadz Rahmat`, password, isActive: "on", gender: "laki_laki" }));
    const cileungsi = await createGroup(form({ name: `${DEMO} Basecamp Cileungsi`, description: "Setoran rutin tiap Selasa & Jumat. Tanya bacaan di grup WhatsApp basecamp." }));
    const cibubur = await createGroup(form({ name: `${DEMO} Basecamp Cibubur` }));
    const driverA = await createMember("peserta", form({ name: `${DEMO} Pak Budi`, password, isActive: "on", groupId: cileungsi.id, gender: "laki_laki" }));
    const driverB = await createMember("peserta", form({ name: `${DEMO} Pak Agus`, password, isActive: "on", groupId: cibubur.id, gender: "laki_laki" }));

    await createTask(
      guru.id,
      form({
        title: `${DEMO} Setoran An-Naba ayat 1–16`,
        description: "Rekam bacaan An-Naba 1–16 saat jeda order. Pelan & tartil.",
        type: "voice_note",
        deadline: wib(72),
        groupIds: [cileungsi.id, cibubur.id],
        approverIds: musyrif.id,
      }),
    );
    await createTask(
      guru.id,
      form({
        title: `${DEMO} Kuis adab di jalan`,
        description: "3 soal singkat. Nilai keluar otomatis.",
        type: "quiz",
        deadline: wib(48),
        groupIds: cileungsi.id,
        questions: JSON.stringify([
          { question: "Doa naik kendaraan diawali dengan…", optionA: "Bismillah", optionB: "Alhamdulillah", optionC: "Subhanalladzi sakhkhara lana hadza", correctOption: "c" },
          { question: "Shalat jamak qashar boleh bagi musafir dengan jarak minimal sekitar…", optionA: "10 km", optionB: "± 80 km", optionC: "1 km", correctOption: "b" },
          { question: "Membaca Al-Qur'an saat mengemudi sebaiknya…", optionA: "Dihafal & dimurajaah, tidak membaca mushaf", optionB: "Membaca mushaf di HP", correctOption: "a" },
        ]),
      }),
    );

    console.log("Data demo Ojol dibuat. Masuk di /ojol/masuk dengan kode berikut (password lihat docs/ojol-demo.md):");
    for (const [label, member] of [["Guru", guru], ["Guru (co-reviewer)", musyrif], ["Peserta", driverA], ["Peserta", driverB]] as const) {
      console.log(`  ${member.code}  ${label}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
