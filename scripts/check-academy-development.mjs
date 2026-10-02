import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import mariadb from "mariadb";
import nextEnv from "@next/env";
import { SignJWT } from "jose";
nextEnv.loadEnvConfig(process.cwd());
const base = new URL(process.env.ACADEMY_TEST_URL ?? "http://localhost:3000");
const dbUrl = new URL(process.env.DATABASE_URL);
assert.ok(["localhost","127.0.0.1"].includes(base.hostname) && ["localhost","127.0.0.1"].includes(dbUrl.hostname));
const db = await mariadb.createConnection({ host: dbUrl.hostname, port: Number(dbUrl.port || 3306), user: decodeURIComponent(dbUrl.username), password: decodeURIComponent(dbUrl.password), database: dbUrl.pathname.slice(1) });
const marker = `Development fixture ${randomUUID()}`;
const ids = { course: randomUUID(), chapter: randomUUID(), lesson: randomUUID(), quiz: randomUUID(), question: randomUUID(), correct: randomUUID(), wrong: randomUUID(), attempt: randomUUID() };
const storage = path.resolve(process.env.ACADEMY_UPLOAD_DIR ?? ".academy-uploads");
let cloneId, profileId;
const sqlDate = date => date.toISOString().slice(0,23).replace("T"," ");
const now = new Date(), past = new Date(now.getTime()-86400_000), future = new Date(now.getTime()+3600_000);
async function session(user) {
  assert.ok(user?.is_active);
  const token = await new SignJWT({ userId: user.id, name: user.name, isSuperadmin: !!user.is_superadmin, moduleSlugs: ["academy"] }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  return `sip_session=${token}`;
}
const decode = value => value.replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
async function get(url, cookie = "", extra = {}) { return fetch(new URL(url,base), { headers: { Cookie: cookie, ...extra }, redirect: "manual" }); }
async function rendered(url,cookie) {
  const response = await get(url,cookie); const html = await response.text();
  assert.equal(response.status,200,url);
  assert.ok(!html.includes('data-msg=') && !html.includes('NEXT_REDIRECT'), `render ${url}`);
  return html;
}
async function action(url,cookie,choose,values = {}) {
  const html = await rendered(url,cookie);
  const fragment = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map(match=>match[0]).find(choose);
  assert.ok(fragment,`find action form ${url}`);
  const data = new FormData();
  for (const match of fragment.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/\bname="([^"]+)"/)?.[1];
    if (name?.startsWith("$ACTION_")) data.append(decode(name),decode(match[0].match(/\bvalue="([^"]*)"/)?.[1] ?? ""));
  }
  for (const [name,value] of Object.entries(values)) data.set(name,String(value));
  const response = await fetch(new URL(url,base),{method:"POST",body:data,headers:{Cookie:cookie,Origin:base.origin},redirect:"manual"});
  assert.ok([200,303].includes(response.status),`action ${url}`);
  return response.text();
}
try {
  const student = (await db.query("SELECT * FROM users WHERE email='peserta.simulasi@insan.academy'"))[0];
  const teacher = (await db.query("SELECT u.* FROM users u JOIN module_access a ON a.user_id=u.id JOIN modules m ON m.id=a.module_id WHERE u.is_active=TRUE AND m.slug='academy' AND a.role='teacher' LIMIT 1"))[0];
  const admin = (await db.query("SELECT * FROM users WHERE is_active=TRUE AND is_superadmin=TRUE LIMIT 1"))[0];
  const studentCookie = await session(student), teacherCookie = await session(teacher), adminCookie = await session(admin);
  profileId = (await db.query("SELECT id FROM zakat_academy_profiles WHERE user_id=?",[student.id]))[0].id;
  await db.query("INSERT INTO zakat_academy_courses (id,title,slug,short_description,is_published,starts_at,registration_open,updated_at) VALUES (?,?,?,?,TRUE,?,FALSE,?)",[ids.course,marker,ids.course,"Temporary fixture",sqlDate(past),sqlDate(now)]);
  await db.query("INSERT INTO zakat_academy_chapters (id,course_id,title,slug,is_published,updated_at) VALUES (?,?,?,?,TRUE,?)",[ids.chapter,ids.course,"Fixture bab",ids.chapter,sqlDate(now)]);
  await db.query("INSERT INTO zakat_academy_lessons (id,chapter_id,title,slug,video_provider,video_url,content_summary,is_published,release_day,updated_at) VALUES (?,?,?,?,?,'',?,TRUE,1,?)",[ids.lesson,ids.chapter,marker,ids.lesson,"AUDIO","Fixture material",sqlDate(now)]);
  await db.query("INSERT INTO zakat_academy_enrollments (id,profile_id,course_id) VALUES (?,?,?)",[randomUUID(),profileId,ids.course]);
  await db.query("INSERT INTO zakat_academy_quizzes (id,chapter_id,title,kind,release_day,closes_at,is_published,is_active,updated_at) VALUES (?,?,?,'DAILY',1,?,TRUE,TRUE,?)",[ids.quiz,ids.chapter,marker,sqlDate(future),sqlDate(now)]);
  const explanation = `PRIVATE_EXPLANATION_${randomUUID()}`;
  await db.query("INSERT INTO zakat_academy_quiz_questions (id,quiz_id,question,explanation) VALUES (?,?,?,?)",[ids.question,ids.quiz,"Fixture question",explanation]);
  await db.query("INSERT INTO zakat_academy_quiz_options (id,question_id,label,is_correct) VALUES (?,?,?,TRUE),(?,?,?,FALSE)",[ids.correct,ids.question,"Correct fixture",ids.wrong,ids.question,"Wrong fixture"]);
  const audio = await fs.readFile("public/academy/audio-simulasi.wav");
  async function upload(cookie,bytes,name) {
    const data = new FormData(); data.set("lessonId",ids.lesson); data.set("file",new File([bytes],name));
    return fetch(new URL("/api/academy/upload",base),{method:"POST",body:data,headers:{Cookie:cookie,Origin:base.origin}});
  }
  assert.equal((await upload(studentCookie,audio,"fixture.wav")).status,403);
  assert.equal((await upload(teacherCookie,Buffer.from("<script>bad</script>"),"fixture.mp3")).status,400);
  const uploaded = await upload(teacherCookie,audio,"fixture.wav"); assert.equal(uploaded.status,200);
  const audioUrl = (await uploaded.json()).fileUrl;
  assert.equal((await get(audioUrl)).status,404);
  const range = await get(audioUrl,studentCookie,{Range:"bytes=0-15"}); assert.equal(range.status,206); assert.equal((await range.arrayBuffer()).byteLength,16);
  assert.equal((await get(audioUrl,studentCookie,{Range:"bytes=9999999-"})).status,416);
  await db.query("UPDATE zakat_academy_lessons SET release_day=30 WHERE id=?",[ids.lesson]);
  assert.equal((await get(audioUrl,studentCookie)).status,404);
  await db.query("UPDATE zakat_academy_lessons SET release_day=1 WHERE id=?",[ids.lesson]);
  const pdf = await upload(teacherCookie,Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF"),"fixture.pdf"); assert.equal(pdf.status,200);
  const pdfUrl = (await pdf.json()).fileUrl;
  const downloaded = await get(pdfUrl,studentCookie); assert.equal(downloaded.status,200); assert.ok(downloaded.headers.get("content-disposition").startsWith("attachment"));
  const resume = await fetch(new URL("/api/academy/audio-progress",base),{method:"POST",headers:{Cookie:studentCookie,Origin:base.origin,"Content-Type":"application/json"},body:JSON.stringify({lessonId:ids.lesson,source:audioUrl,position:1.25})}); assert.equal(resume.status,200);
  const saved = (await db.query("SELECT audio_position,audio_source,completed FROM zakat_academy_lesson_progress WHERE profile_id=? AND lesson_id=?",[profileId,ids.lesson]))[0];
  assert.equal(saved.audio_position,1.25); assert.equal(saved.audio_source,audioUrl); assert.equal(saved.completed,0);
  const lessonHtml = await rendered(`/academy/program/${ids.course}/${ids.lesson}`,studentCookie); assert.ok(lessonHtml.includes('initialPosition\\":1.25') || lessonHtml.includes('initialPosition":1.25'));
  console.log("PASS: authorized audio/PDF upload, private/range downloads, release gate and persistent resume");
  const reminderHtml = await rendered("/academy/pengingat",studentCookie); assert.ok(reminderHtml.includes(marker));
  const marked = await action("/academy/pengingat",studentCookie,form=>form.includes(ids.quiz),{}); assert.ok(marked.includes("Ditandai sudah dibaca"));
  assert.ok((await db.query("SELECT id FROM academy_notification_reads WHERE profile_id=? AND `key` LIKE ?",[profileId,`${ids.quiz}:%`])).length);
  assert.ok((await rendered("/academy/pengajar/nilai",teacherCookie)).includes(marker));
  const snapshot = {passingScore:70,timeLimitMinutes:10,closesAt:past.toISOString(),questions:[{id:ids.question,question:"Fixture question",explanation,type:"SINGLE",weight:1,options:[{id:ids.correct,label:"Correct fixture",isCorrect:true},{id:ids.wrong,label:"Wrong fixture",isCorrect:false}]}],responses:{[ids.question]:ids.correct}};
  await db.query("INSERT INTO zakat_academy_quiz_attempts (id,profile_id,quiz_id,score,passed,answers,is_completed,submitted_at) VALUES (?,?,?,100,TRUE,?,TRUE,?)",[ids.attempt,profileId,ids.quiz,JSON.stringify(snapshot),sqlDate(now)]);
  const resultUrl = `/academy/kuis/${ids.quiz}/hasil/${ids.attempt}`;
  assert.ok(!(await rendered(resultUrl,studentCookie)).includes(explanation),"no answer explanation before close");
  await db.query("UPDATE zakat_academy_quizzes SET closes_at=? WHERE id=?",[sqlDate(new Date(now.getTime()-60000)),ids.quiz]);
  assert.ok((await rendered(resultUrl,studentCookie)).includes(explanation),"answer explanation after close");
  assert.ok(!(await rendered("/academy/pengingat",studentCookie)).includes(marker),"completed exam reminder removed");
  console.log("PASS: personal reminders/read state, teacher support view and review close-time gate");
  const cloneTitle = `${marker} cloned`;
  const cloned = await action("/admin/academy/angkatan",adminCookie,form=>form.includes('name="sourceId"'),{title:cloneTitle,sourceId:ids.course}); assert.ok(cloned.includes("Angkatan dibuat sebagai draft"));
  const clone = (await db.query("SELECT * FROM zakat_academy_courses WHERE title=?",[cloneTitle]))[0]; assert.ok(clone); cloneId=clone.id;
  assert.equal(clone.starts_at,null); assert.equal(clone.registration_open,0); assert.equal(clone.is_published,0);
  assert.equal(Number((await db.query("SELECT COUNT(*) AS n FROM zakat_academy_enrollments WHERE course_id=?",[cloneId]))[0].n),0);
  const cloneQuiz = (await db.query("SELECT q.* FROM zakat_academy_quizzes q JOIN zakat_academy_chapters h ON h.id=q.chapter_id WHERE h.course_id=?",[cloneId]))[0];
  assert.ok(cloneQuiz); assert.equal(cloneQuiz.closes_at,null); assert.equal(cloneQuiz.is_published,0); assert.equal(cloneQuiz.is_active,0);
  const cloneLesson = (await db.query("SELECT l.* FROM zakat_academy_lessons l JOIN zakat_academy_chapters h ON h.id=l.chapter_id WHERE h.course_id=?",[cloneId]))[0];
  assert.ok(cloneLesson.video_url !== audioUrl); assert.equal((await get(cloneLesson.video_url,teacherCookie)).status,200); assert.equal((await get(cloneLesson.video_url,studentCookie)).status,404);
  console.log("PASS: cohort clone isolates participants, exams, schedules and protected uploaded files");
} finally {
  const fixtureCourses = [ids.course,...(cloneId ? [cloneId] : [])];
  if (profileId) await db.query("DELETE FROM academy_notification_reads WHERE profile_id=? AND `key` LIKE ?",[profileId,`${ids.quiz}:%`]);
  await db.query("DELETE FROM zakat_academy_quiz_attempts WHERE id=? AND quiz_id=?",[ids.attempt,ids.quiz]);
  await db.query("DELETE FROM zakat_academy_lesson_progress WHERE lesson_id=?",[ids.lesson]);
  await db.query("DELETE FROM zakat_academy_enrollments WHERE course_id=?",[ids.course]);
  const files = await db.query("SELECT a.id,a.file_type FROM zakat_academy_lesson_attachments a JOIN zakat_academy_lessons l ON l.id=a.lesson_id JOIN zakat_academy_chapters h ON h.id=l.chapter_id WHERE h.course_id IN (?)",[fixtureCourses]);
  const extensions = {"audio/wav":"wav","application/pdf":"pdf"};
  for (const file of files) {
    if (!extensions[file.file_type] || !/^[a-zA-Z0-9-]+$/.test(file.id)) continue;
    const target = path.resolve(storage,`${file.id}.${extensions[file.file_type]}`); assert.ok(target.startsWith(storage+path.sep)); await fs.unlink(target).catch(error=>{if(error.code!=="ENOENT") throw error;});
  }
  await db.query("DELETE FROM zakat_academy_courses WHERE id IN (?) AND title LIKE ?",[fixtureCourses,`${marker}%`]);
  await db.end();
}
