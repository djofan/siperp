import assert from "node:assert/strict";
import fs from "node:fs";
import mariadb from "mariadb";
import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";

const base = new URL(process.env.ACADEMY_TEST_URL ?? "http://localhost:3000");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
const accounts = JSON.parse(fs.readFileSync("academy-simulation.local.json", "utf8")).accounts;
const cookies = new Map();
const decode = value => value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
async function saveNote(html, path, cookie, content) {
  const noteForm = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map(match => match[0]).find(form => form.includes('name="content"'));
  assert.ok(noteForm, "private note form");
  const data = new FormData();
  for (const match of noteForm.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/\bname="([^"]+)"/)?.[1];
    if (name?.startsWith("$ACTION_")) data.append(decode(name), decode(match[0].match(/\bvalue="([^"]*)"/)?.[1] ?? ""));
  }
  data.set("content", content);
  const response = await fetch(new URL(path, base), { method: "POST", body: data, headers: { Cookie: cookie, Origin: base.origin }, redirect: "manual" });
  assert.equal(response.status, 200, "save private note");
  assert.ok((await response.text()).includes("Catatan pribadi tersimpan"));
}
async function page(path, cookie = "") {
  return fetch(new URL(path, base), { redirect: "manual", headers: { Cookie: cookie } });
}
for (const path of ["/academy", "/academy/masuk", "/academy/daftar"]) {
  const response = await page(path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const serverError = html.match(/data-msg="([\s\S]*?)" data/);
  if (serverError) throw new Error(serverError[1].replace(/&quot;/g, '"').slice(0,3000));
  if (path === "/academy/daftar") {
    assert.match(html, /academy-register-password/);
    assert.match(html, /200/);
  }
}
for (const account of accounts) {
  const response = await fetch(new URL("/api/auth/login", base), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  let cookie = response.headers.get("set-cookie")?.split(";")[0];
  // Opt-in local authorization tests after a user changes their demo password.
  // This never resets the account password or grants a new role.
  if (response.status === 401 && process.env.ACADEMY_TEST_SESSION_ONLY === "1") {
    nextEnv.loadEnvConfig(process.cwd());
    const dbUrl = new URL(process.env.DATABASE_URL);
    assert.ok(["localhost", "127.0.0.1"].includes(dbUrl.hostname));
    const connection = await mariadb.createConnection({ host: dbUrl.hostname, user: decodeURIComponent(dbUrl.username), password: decodeURIComponent(dbUrl.password), database: dbUrl.pathname.slice(1), port: Number(dbUrl.port || 3306) });
    try {
      const user = (await connection.query("SELECT u.id,u.name FROM users u JOIN module_access a ON a.user_id=u.id JOIN modules m ON m.id=a.module_id WHERE u.email=? AND u.is_active=TRUE AND u.is_superadmin=FALSE AND m.slug='academy' AND a.role='teacher'", [account.email]))[0];
      assert.ok(user && account.role === "pengajar");
      const token = await new SignJWT({ userId: user.id, name: user.name, isSuperadmin: false, moduleSlugs: ["academy"] }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(process.env.SESSION_SECRET));
      cookie = `sip_session=${token}`;
      console.log("INFO: teacher password has changed; checking existing teacher authorization with a short-lived local test session");
    } finally { await connection.end(); }
  } else assert.equal(response.status, 200, `login ${account.role}`);
  assert.ok(cookie);
  cookies.set(account.role, cookie);
  const onward = await page("/academy/lanjut", cookie);
  const target = account.role === "pengajar" ? "/academy/pengajar" : "/academy/belajar";
  const onwardHtml = await onward.text();
  assert.ok(onward.headers.get("location") === target || onwardHtml.includes(`NEXT_REDIRECT;replace;${target};`), "correct role destination");
  const paths = account.role === "pengajar" ? ["/academy/pengajar", "/academy/pengajar/materi", "/academy/pengajar/ujian", "/academy/pengajar/pertanyaan", "/academy/pengajar/nilai", "/academy/akun"] : ["/academy/belajar", "/academy/akun", "/academy/catatan", "/academy/tanya-jawab", "/academy/kuis", "/academy/peringkat", "/academy/program/simulasi-insan-academy/simulasi-audio"];
  for (const path of paths) {
    const result = await page(path, cookie);
    assert.equal(result.status, 200, `${account.role}: ${path}`);
    const html = await result.text();
    assert.ok(!html.includes("Internal Server Error") && !html.includes("data-msg="), `server rendering ${path}`);
    const redirect = html.match(/NEXT_REDIRECT[^"\\]+/);
    assert.ok(!redirect, `${path}: ${redirect?.[0]}`);
    assert.ok(!html.includes("Kemajuan Saya"), "progress tab removed");
    if (account.role === "pengajar") assert.ok(!html.includes('href="/academy/sertifikat"'), "teacher navigation has no certificate");
    if (path.endsWith("simulasi-audio")) assert.ok(html.includes("audio-simulasi.wav"), `simulation audio player renders: ${html.match(/Materi belum dibuka|NEXT_NOT_FOUND|data-dgst="[^"]+"|Tanggal mulai[^<]+|Materi tersedia[^<]+/)?.[0]}`);
    if (path.endsWith("simulasi-audio")) {
      const original = decode(html.match(/<textarea[^>]*name="content"[^>]*>([\s\S]*?)<\/textarea>/)?.[1] ?? "");
      const marker = `Catatan uji otomatis ${Date.now()}`;
      try {
        await saveNote(html, path, cookie, marker);
        assert.ok((await (await page("/academy/catatan", cookie)).text()).includes(marker), "saved note visible to participant");
      } finally { await saveNote(html, path, cookie, original); }
    }
  }
  const admin = await page("/admin/academy/pendaftaran", cookie);
  const adminHtml = await admin.text();
  assert.ok([303, 307, 308, 403].includes(admin.status) || adminHtml.includes("NEXT_REDIRECT"), "simulation account must not access admin");
  const contacts = await page("/api/academy/contacts", cookie);
  assert.notEqual(contacts.status, 200, "simulation account must not export participant contacts");
  if (account.role === "peserta") {
    for (const path of ["/academy/pengajar", "/academy/pengajar/materi", "/academy/pengajar/ujian", "/academy/pengajar/nilai", "/academy/pengajar/pertanyaan"]) {
      const teacher = await page(path, cookie);
      const teacherHtml = await teacher.text();
      assert.ok(teacher.status === 307 || teacherHtml.includes("NEXT_REDIRECT;replace;/academy/belajar;"), `participant denied ${path}`);
    }
  } else {
    for (const path of ["/academy/sertifikat", "/academy/peringkat", "/academy/belajar"]) {
      const response = await page(path, cookie);
      const html = await response.text();
      assert.ok(response.status === 307 || html.includes("NEXT_REDIRECT;replace;/academy/pengajar;"), `teacher denied ${path}`);
    }
  }
  console.log(`PASS: ${response.status === 200 ? "login, " : ""}learning pages and access boundaries (${account.role})`);
}
console.log("PASS: public registration and authentication pages");

// Isolated content fixtures only inside the simulation course; always removed.
nextEnv.loadEnvConfig(process.cwd());
const url = new URL(process.env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
const db = await mariadb.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) });
const marker = `Uji peran ${randomUUID()}`;
const teacherCookie = cookies.get("pengajar");
async function submit(path, formContains, values, cookie = teacherCookie, expectDenied = false) {
  const html = await (await page(path, teacherCookie)).text();
  const fragment = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map(match => match[0]).find(form => form.includes(formContains));
  assert.ok(fragment, `form ${formContains}`);
  const data = new FormData();
  for (const match of fragment.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/\bname="([^"]+)"/)?.[1];
    if (name?.startsWith("$ACTION_")) data.append(decode(name), decode(match[0].match(/\bvalue="([^"]*)"/)?.[1] ?? ""));
  }
  for (const [name, value] of Object.entries(values)) data.set(name, String(value));
  const response = await fetch(new URL(path, base), { method: "POST", body: data, headers: { Cookie: cookie, Origin: base.origin }, redirect: "manual" });
  const result = await response.text();
  if (expectDenied) assert.ok([303, 307].includes(response.status) || result.includes("NEXT_REDIRECT"));
  else assert.ok([200, 303].includes(response.status));
  return result;
}
let lessonId, quizId;
try {
  const chapter = (await db.query("SELECT h.id,c.slug FROM zakat_academy_chapters h JOIN zakat_academy_courses c ON c.id=h.course_id WHERE c.slug='simulasi-insan-academy' LIMIT 1"))[0];
  assert.ok(chapter);
  const material = { chapterId: chapter.id, title: marker, contentSummary: "Materi teks untuk pengujian peran pengajar.", videoUrl: "", releaseDay: 1, order: 100, isPublished: "on" };
  await submit("/academy/pengajar/materi", 'name="contentSummary"', material, cookies.get("peserta"), true);
  assert.equal((await db.query("SELECT id FROM zakat_academy_lessons WHERE chapter_id=? AND title=?", [chapter.id, marker])).length, 0, "participant cannot invoke teacher material action");
  await submit("/academy/pengajar/materi", 'name="contentSummary"', material);
  const lesson = (await db.query("SELECT id,slug,content_summary,is_published FROM zakat_academy_lessons WHERE chapter_id=? AND title=?", [chapter.id, marker]))[0];
  assert.ok(lesson?.is_published); lessonId = lesson.id;
  const learnerPath = `/academy/program/${chapter.slug}/${lesson.slug}`;
  let learnerHtml = await (await page(learnerPath, cookies.get("peserta"))).text();
  assert.ok(learnerHtml.includes(material.contentSummary));
  assert.ok(!learnerHtml.includes('<audio '), "text-only material has no empty audio player");
  const teacherHtml = await (await page("/academy/pengajar/materi", teacherCookie)).text();
  const editing = [...teacherHtml.matchAll(/<form\b[\s\S]*?<\/form>/g)].map(match => match[0]).find(form => form.includes(`value="${marker}"`));
  assert.ok(editing);
  const editData = new FormData();
  for (const match of editing.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/\bname="([^"]+)"/)?.[1];
    if (name?.startsWith("$ACTION_")) editData.append(decode(name), decode(match[0].match(/\bvalue="([^"]*)"/)?.[1] ?? ""));
  }
  for (const [key, value] of Object.entries({ ...material, videoUrl: "/academy/audio-simulasi.wav" })) editData.set(key, String(value));
  await fetch(new URL("/academy/pengajar/materi", base), { method: "POST", body: editData, headers: { Cookie: teacherCookie, Origin: base.origin } });
  learnerHtml = await (await page(learnerPath, cookies.get("peserta"))).text();
  assert.ok(learnerHtml.includes(material.contentSummary) && learnerHtml.includes("audio-simulasi.wav"), "text and audio together");
  const quizValues = { chapterId: chapter.id, title: marker, kind: "DAILY", releaseDay: 1, passingScore: 70, timeLimitMinutes: 10, description: "", quizDate: "", closesAt: "" };
  await submit("/academy/pengajar/ujian", 'name="kind"', quizValues);
  const quiz = (await db.query("SELECT id FROM zakat_academy_quizzes WHERE chapter_id=? AND title=?", [chapter.id, marker]))[0];
  assert.ok(quiz); quizId = quiz.id;
  const examPath = `/academy/pengajar/ujian/${quizId}`;
  await submit(examPath, 'name="options"', { question: "Contoh pertanyaan pengujian?", type: "SINGLE", weight: 2, order: 0, options: JSON.stringify([{ id: "", label: "Benar", isCorrect: true }, { id: "", label: "Salah", isCorrect: false }]) });
  assert.equal(Number((await db.query("SELECT COUNT(*) AS n FROM zakat_academy_quiz_questions WHERE quiz_id=?", [quizId]))[0].n), 1);
  await submit(examPath, 'name="kind"', { ...quizValues, isPublished: "on", isActive: "on" });
  assert.ok((await db.query("SELECT is_published,is_active FROM zakat_academy_quizzes WHERE id=?", [quizId]))[0].is_published);
  const examHtml = await (await page(`/academy/kuis/${quizId}`, cookies.get("peserta"))).text();
  assert.ok(examHtml.includes(marker) && !examHtml.includes("NEXT_REDIRECT"));
  console.log("PASS: teacher creates text/audio material, questions and publishes participant exam");
} finally {
  if (quizId) await db.query("DELETE FROM zakat_academy_quizzes WHERE id=? AND title=?", [quizId, marker]);
  if (lessonId) await db.query("DELETE FROM zakat_academy_lessons WHERE id=? AND title=?", [lessonId, marker]);
  await db.end();
}
