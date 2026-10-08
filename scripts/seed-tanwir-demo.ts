// Data demo Tanwir Qurani untuk pengujian manual di database LOKAL (lihat docs/tanwir-demo.md).
//   npm run db:seed:tanwir-demo            → buat akun & tugas contoh (aman dijalankan ulang)
//   npm run db:seed:tanwir-demo -- --clean → hapus semua data demo
// Menolak berjalan pada database non-lokal atau NODE_ENV=production.
import { loadEnvConfig } from "@next/env";

const DEMO = "[Demo]";

async function main() {
  loadEnvConfig(process.cwd());
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || process.env.NODE_ENV === "production") {
    throw new Error("Seed demo Tanwir hanya untuk database lokal pengembangan.");
  }
  const password = process.env.TANWIR_DEMO_PASSWORD ?? "demo-tanwir-2026";

  const { prisma } = await import("@/lib/prisma");
  const { createMember } = await import("@/modules/tanwir/api/members");
  const { createGroup } = await import("@/modules/tanwir/api/groups");
  const { createTask } = await import("@/modules/tanwir/api/tasks");
  const { deleteUpload } = await import("@/modules/tanwir/api/files");

  try {
    if (process.argv.includes("--clean")) {
      const members = await prisma.tanwirMember.findMany({
        where: { user: { name: { startsWith: DEMO } } },
        select: { userId: true, photo: true, submissions: { select: { filePath: true } } },
      });
      await prisma.tanwirTask.deleteMany({ where: { title: { startsWith: DEMO } } });
      await prisma.tanwirGroup.deleteMany({ where: { name: { startsWith: DEMO } } });
      await prisma.user.deleteMany({ where: { id: { in: members.map((member) => member.userId) } } });
      await Promise.all(members.flatMap((member) => [deleteUpload(member.photo), ...member.submissions.map((row) => deleteUpload(row.filePath))]));
      console.log(`Data demo Tanwir dihapus (${members.length} akun).`);
      return;
    }

    if (await prisma.tanwirMember.count({ where: { user: { name: { startsWith: DEMO } } } })) {
      const existing = await prisma.tanwirMember.findMany({
        where: { user: { name: { startsWith: DEMO } } },
        orderBy: { code: "asc" },
        select: { code: true, role: true, user: { select: { name: true } } },
      });
      console.log("Data demo sudah ada. Akun:");
      for (const member of existing) console.log(`  ${member.code}  ${member.role.padEnd(7)}  ${member.user.name}`);
      return;
    }

    const form = (entries: Record<string, string>) => {
      const data = new FormData();
      for (const [key, value] of Object.entries(entries)) data.set(key, value);
      return data;
    };
    const wib = (hours: number) => new Date(Date.now() + hours * 3_600_000 + 7 * 3_600_000).toISOString().slice(0, 16);

    const guru = await createMember("guru", form({ name: `${DEMO} Ustadz Ahmad`, password, isActive: "on", phone: "081200000001", gender: "laki_laki" }));
    const group = await createGroup(
      form({ name: `${DEMO} Kelompok Cileungsi`, picId: guru.id, description: "Setoran rutin setiap Senin & Kamis. Pertanyaan seputar bacaan bisa disampaikan di grup WhatsApp kelompok." }),
    );
    const pesertaA = await createMember(
      "peserta",
      form({ name: `${DEMO} Ustadzah Fatimah`, password, isActive: "on", groupId: group.id, teachingPlace: "TPQ Al-Ikhlas", gender: "perempuan" }),
    );
    const pesertaB = await createMember(
      "peserta",
      form({ name: `${DEMO} Ustadz Yusuf`, password, isActive: "on", groupId: group.id, teachingPlace: "TPQ Nurul Huda", gender: "laki_laki" }),
    );

    await createTask(guru.id, form({ title: `${DEMO} Setoran Surah Al-Mulk ayat 1–10`, description: "Rekam bacaan Al-Mulk ayat 1–10 dengan tartil. Perhatikan panjang pendek mad.", type: "voice_note", deadline: wib(72) }));
    await createTask(guru.id, form({ title: `${DEMO} Video praktik mengajar Iqra`, description: "Rekam video singkat (maks. 3 menit) saat Anda mengajar Iqra jilid 2.", type: "video", deadline: wib(24 * 7) }));
    await createTask(
      guru.id,
      form({
        title: `${DEMO} Kuis tajwid dasar`,
        description: "Kerjakan 3 soal tajwid dasar. Nilai keluar otomatis.",
        type: "quiz",
        deadline: wib(48),
        questions: JSON.stringify([
          { question: "Hukum bacaan nun sukun bertemu huruf ba disebut…", optionA: "Idgham", optionB: "Iqlab", optionC: "Ikhfa", optionD: "Izhar", correctOption: "b" },
          { question: "Berapa harakat panjang mad thabi'i?", optionA: "1 harakat", optionB: "2 harakat", optionC: "4 harakat", optionD: "6 harakat", correctOption: "b" },
          { question: "Huruf qalqalah berjumlah…", optionA: "3", optionB: "5", optionC: "7", correctOption: "b" },
        ]),
      }),
    );

    console.log("Data demo Tanwir dibuat. Masuk di /tanwir/masuk dengan kode berikut (password lihat docs/tanwir-demo.md):");
    for (const [label, member] of [["Guru", guru], ["Peserta", pesertaA], ["Peserta", pesertaB]] as const) {
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
