import fs from "node:fs";
import path from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import mariadb from "mariadb";
import bcrypt from "bcryptjs";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const migrations = ["20261001130000_insan_academy_learning", "20261001140000_academy_quiz_schedule", "20261001160000_academy_development"];
const url = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Setup akun simulasi hanya untuk database lokal.");
const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), timezone: "+00:00" });
const id = () => randomUUID();
const now = new Date();
const nowSql = now.toISOString().slice(0, 23).replace("T", " ");
const credentialsPath = path.join(process.cwd(), "academy-simulation.local.json");
try {
  for (const migration of migrations) {
  const applied = await db.query("SELECT finished_at FROM _prisma_migrations WHERE migration_name=? AND rolled_back_at IS NULL", [migration]);
  if (!applied.some(row => row.finished_at)) {
    const sql = fs.readFileSync(path.join("prisma/migrations", migration, "migration.sql"), "utf8");
    for (const statement of sql.split(";").map(value => value.trim()).filter(Boolean)) await db.query(statement);
    const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "resolve", "--applied", migration], { stdio: "inherit" });
    if (result.status !== 0) throw new Error("Migrasi telah dijalankan tetapi pencatatannya belum berhasil.");
  }
  }
  await db.query("UPDATE modules SET name=?, description=? WHERE slug=?", ["Insan Academy", "Pembelajaran audio Ustadz Irham selama satu bulan", "academy"]);
  for (const [key, value] of Object.entries({ cs_phone: "628111186626", daily_weight: "20", weekly_weight: "30", final_weight: "50" })) {
    await db.query("INSERT INTO zakat_academy_settings (id,`key`,value,updated_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE `key`=VALUES(`key`)", [id(), key, value, now]);
  }
  async function course(slug, title, simulation) {
    await db.query("INSERT INTO zakat_academy_courses (id,title,slug,short_description,is_published,`order`,teacher,quota,duration_days,starts_at,is_simulation,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE slug=VALUES(slug)",
      [id(), title, slug, simulation ? "Data latihan akun, pemutar audio, catatan, dan tiga jenis soal. Bukan materi resmi Ustadz Irham." : "Belajar bersama Ustadz Irham melalui audio harian, evaluasi pekanan, dan tanya jawab selama satu bulan.", true, simulation ? 999 : 0, "Ustadz Irham", 200, 30, simulation ? nowSql : null, simulation, now]);
    return (await db.query("SELECT id FROM zakat_academy_courses WHERE slug=?", [slug]))[0].id;
  }
  const main = await course("insan-academy", "Insan Academy — Angkatan 1", false);
  async function draftQuiz(chapterId, title, kind, releaseDay) {
    if (!(await db.query("SELECT id FROM zakat_academy_quizzes WHERE chapter_id=? AND title=?",[chapterId,title])).length) {
      await db.query("INSERT INTO zakat_academy_quizzes (id,chapter_id,title,kind,release_day,passing_score,time_limit_minutes,is_published,is_active,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",[id(),chapterId,title,kind,releaseDay,70,kind === "FINAL" ? 30 : 10,false,false,now]);
    }
  }
  const obsoleteSlugs = [1,2,3,4].map(week => `insan-pekan-${week}-hari-5`).concat([1,2,3,4].map(day => `insan-pekan-4-hari-${day}`));
  await db.query("DELETE l FROM zakat_academy_lessons l JOIN zakat_academy_chapters h ON h.id=l.chapter_id WHERE h.course_id=? AND l.slug IN (?) AND l.is_published=FALSE AND l.video_url='' AND COALESCE(l.content_summary,'')='' AND l.title LIKE '%Menunggu rekaman' AND NOT EXISTS (SELECT 1 FROM zakat_academy_lesson_progress p WHERE p.lesson_id=l.id) AND NOT EXISTS (SELECT 1 FROM academy_study_notes n WHERE n.lesson_id=l.id) AND NOT EXISTS (SELECT 1 FROM zakat_academy_lesson_attachments a WHERE a.lesson_id=l.id)", [main, obsoleteSlugs]);
  await db.query("DELETE q FROM zakat_academy_quizzes q JOIN zakat_academy_chapters h ON h.id=q.chapter_id WHERE h.course_id=? AND h.slug='pekan-4' AND q.title IN (?) AND q.is_published=FALSE AND NOT EXISTS (SELECT 1 FROM zakat_academy_quiz_questions s WHERE s.quiz_id=q.id) AND NOT EXISTS (SELECT 1 FROM zakat_academy_quiz_attempts a WHERE a.quiz_id=q.id)", [main, ["Evaluasi Harian 16","Evaluasi Harian 17","Evaluasi Harian 18","Evaluasi Harian 19","Evaluasi Pekanan 4","Ujian Akhir","Ujian Per Bab 4 — Akhir Bulan"]]);
  await db.query("DELETE FROM zakat_academy_chapters WHERE course_id=? AND slug='pekan-4' AND NOT EXISTS (SELECT 1 FROM zakat_academy_lessons l WHERE l.chapter_id=zakat_academy_chapters.id) AND NOT EXISTS (SELECT 1 FROM zakat_academy_quizzes q WHERE q.chapter_id=zakat_academy_chapters.id)", [main]);
  for (let week = 1; week <= 3; week++) {
    const slug = "pekan-" + week;
    await db.query("INSERT INTO zakat_academy_chapters (id,course_id,title,slug,description,`order`,is_published,updated_at) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE slug=VALUES(slug)", [id(), main, `Pekan ${week}`, slug, "Audio harian, murojaah, dan evaluasi pekanan. Materi menunggu rekaman Ustadz Irham.", week, true, now]);
    const chapter = (await db.query("SELECT id FROM zakat_academy_chapters WHERE course_id=? AND slug=?", [main, slug]))[0].id;
    for (let day = 1; day <= 4; day++) {
      const lessonSlug = `insan-pekan-${week}-hari-${day}`;
      await db.query("INSERT INTO zakat_academy_lessons (id,chapter_id,title,slug,video_provider,video_url,`order`,is_published,release_day,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE slug=VALUES(slug)", [id(), chapter, `Halaqah ${(week - 1) * 4 + day} — Menunggu rekaman`, lessonSlug, "AUDIO", "", day, false, (week - 1) * 7 + day, now]);
      await db.query("UPDATE zakat_academy_lessons SET title=? WHERE slug=? AND is_published=FALSE AND video_url='' AND COALESCE(content_summary,'')='' AND title LIKE 'Halaqah %Menunggu rekaman'", [`Halaqah ${(week - 1) * 4 + day} — Menunggu rekaman`, lessonSlug]);
      if (day <= 4) await draftQuiz(chapter, `Evaluasi Harian ${(week - 1) * 5 + day}`, "DAILY", (week - 1) * 7 + day);
    }
    if (week <= 3) await draftQuiz(chapter, `Evaluasi Pekanan ${week}`, "WEEKLY", (week - 1) * 7 + 6);
    await draftQuiz(chapter, `Ujian Per Bab ${week} — Akhir Bulan`, "FINAL", 30);
    // Hanya hapus placeholder lama yang belum pernah diisi atau dikerjakan.
    await db.query("DELETE FROM zakat_academy_quizzes WHERE chapter_id=? AND title IN (?,?,?) AND is_published=FALSE AND NOT EXISTS (SELECT 1 FROM zakat_academy_quiz_questions q WHERE q.quiz_id=zakat_academy_quizzes.id) AND NOT EXISTS (SELECT 1 FROM zakat_academy_quiz_attempts a WHERE a.quiz_id=zakat_academy_quizzes.id)", [chapter, `Evaluasi Harian ${week * 5}`, week === 4 ? "Evaluasi Pekanan 4" : "", "Ujian Akhir"]);
  }
  const simulation = await course("simulasi-insan-academy", "Simulasi Insan Academy", true);
  await db.query("UPDATE zakat_academy_courses SET starts_at=? WHERE id=? AND (starts_at IS NULL OR starts_at>?)", [nowSql, simulation, nowSql]);
  await db.query("INSERT INTO zakat_academy_chapters (id,course_id,title,slug,`order`,is_published,updated_at) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE slug=VALUES(slug)", [id(), simulation, "Pekan Simulasi", "pekan-simulasi", 1, true, now]);
  const chapter = (await db.query("SELECT id FROM zakat_academy_chapters WHERE course_id=? AND slug=?", [simulation, "pekan-simulasi"]))[0].id;
  // A short tone validates the player; it is explicitly not an ustadz recording.
  const samples = 24000, wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF",0); wav.writeUInt32LE(wav.length - 8,4); wav.write("WAVEfmt ",8); wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22); wav.writeUInt32LE(8000,24); wav.writeUInt32LE(16000,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write("data",36); wav.writeUInt32LE(samples * 2,40);
  for (let i=0;i<samples;i++) wav.writeInt16LE(Math.round(Math.sin(i / 8000 * Math.PI * 2 * 440) * 2000),44 + i * 2);
  fs.mkdirSync("public/academy",{recursive:true}); fs.writeFileSync("public/academy/audio-simulasi.wav",wav);
  await db.query("INSERT INTO zakat_academy_lessons (id,chapter_id,title,slug,video_provider,video_url,content_summary,`order`,is_published,release_day,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE slug=VALUES(slug)",
    [id(),chapter,"Uji pemutar audio dan catatan","simulasi-audio","AUDIO","/academy/audio-simulasi.wav","Audio ini hanya bunyi uji pemutar selama tiga detik, bukan kajian atau rekaman Ustadz Irham. Coba menulis catatan belajar, tandai selesai, lalu kerjakan kuis simulasi.",1,true,1,now]);
  for (const kind of ["DAILY","WEEKLY","FINAL"]) {
    const title = {DAILY:"Evaluasi Harian Simulasi",WEEKLY:"Evaluasi Pekanan Simulasi",FINAL:"Ujian Akhir Simulasi"}[kind];
    let quiz = (await db.query("SELECT id FROM zakat_academy_quizzes WHERE chapter_id=? AND title=?",[chapter,title]))[0];
    if (!quiz) {
      quiz = {id:id()};
      await db.query("INSERT INTO zakat_academy_quizzes (id,chapter_id,title,passing_score,time_limit_minutes,is_published,is_active,allow_retake,kind,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",[quiz.id,chapter,title,70,10,true,true,true,kind,now]);
      for (const [type,question,weight,options] of [
        ["SINGLE","Siapa pemateri utama Insan Academy?",1,[["Ustadz Irham",true],["Pemateri berganti setiap hari",false]]],
        ["TRUE_FALSE","Materi Insan Academy berbentuk audio.",1,[["Benar",true],["Salah",false]]],
        ["MULTIPLE","Pilih kegiatan belajar di Insan Academy.",2,[["Menyimak audio",true],["Mencatat dan murojaah",true],["Melewati semua evaluasi",false]]],
      ]) {
        const questionId=id();await db.query("INSERT INTO zakat_academy_quiz_questions (id,quiz_id,question,type,weight,`order`) VALUES (?,?,?,?,?,?)",[questionId,quiz.id,question,type,weight,type === "SINGLE" ? 1 : type === "TRUE_FALSE" ? 2 : 3]);
        for(const [label,correct] of options) await db.query("INSERT INTO zakat_academy_quiz_options (id,question_id,label,is_correct) VALUES (?,?,?,?)",[id(),questionId,label,correct]);
      }
    }
  }
  const stored = fs.existsSync(credentialsPath) ? JSON.parse(fs.readFileSync(credentialsPath,"utf8")) : { accounts: [] };
  for(const [email,name,teacher] of [["peserta.simulasi@insan.academy","Peserta Simulasi",false],["pengajar.simulasi@insan.academy","Pengajar Simulasi",true]]) {
    let account=(await db.query("SELECT id FROM users WHERE email=?",[email]))[0];
    if(!account) {
      const password = "Ia!"+randomBytes(12).toString("base64url");account={id:id()};
      await db.query("INSERT INTO users (id,name,email,password_hash,is_active,is_superadmin) VALUES (?,?,?,?,?,?)",[account.id,name,email,await bcrypt.hash(password,12),true,false]);
      stored.accounts.push({role:teacher ? "pengajar" : "peserta",email,password});
    }
    await db.query("INSERT INTO zakat_academy_profiles (id,user_id,updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id)",[id(),account.id,now]);
    const profile=(await db.query("SELECT id FROM zakat_academy_profiles WHERE user_id=?",[account.id]))[0];
    if(teacher) {
      const moduleRow=(await db.query("SELECT id FROM modules WHERE slug='academy'"))[0];
      await db.query("INSERT INTO module_access (id,user_id,module_id,role) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE role=VALUES(role)",[id(),account.id,moduleRow.id,"teacher"]);
    } else await db.query("INSERT INTO zakat_academy_enrollments (id,profile_id,course_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE profile_id=VALUES(profile_id)",[id(),profile.id,simulation]);
  }
  fs.writeFileSync(credentialsPath, JSON.stringify({login:"http://localhost:3000/academy/masuk",...stored},null,2));
  console.log("Insan Academy siap: 12 materi selama 3 minggu; minggu ke-4 tanpa materi baru. Kredensial tersimpan di academy-simulation.local.json.");
} catch(error) { console.error(error.code || error.message); process.exitCode=1; }
finally { await db.end(); }
