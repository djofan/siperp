import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { requireTanwirAdmin } from "../../api/access";
import { getTaskRecaps, getTaskRecap, getSubmissionRecap, recapQuery, type RecapParams, type RecapCounts, type RecapMeta, type RecapQuestion } from "../../api/task-recaps";
import { TASK_TYPE_LABEL } from "../../api/policy";
import { Button, ButtonLink, Card, inputClass, Stat, SubmissionPill, TypePill, ScoreBadge, LatePill, formatDateTime } from "../ui";
import { SubmissionMedia } from "../app/SubmissionMedia";
import { QuizReview } from "../app/QuizReview";
import { ReviewHistory } from "../app/ReviewHistory";
import s from "./TaskRecap.module.css";

const base = "/admin/tanwir/rekap-tugas";
async function read<T>(load: () => Promise<T>) {
  try { return await load(); } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 422) return null;
    throw error;
  }
}
function InvalidFilters({ href }: { href: string }) { return <Card><h1>Filter rekap belum valid</h1><p className={s.muted}>Pilih kelompok, PIC, dan status yang tersedia.</p><ButtonLink href={href}>Reset filter</ButtonLink></Card>; }
function Stats({ counts }: { counts: RecapCounts }) { return <div className={s.stats}>{[
  ["Peserta", counts.participants], ["Sudah mengumpulkan", counts.submitted], ["Belum mengumpulkan", counts.missing], ["Menunggu koreksi", counts.pending], ["Disetujui", counts.approved], ["Perlu diulang", counts.rejected],
].map(([label, value]) => <Stat key={label} label={String(label)} value={value} />)}</div>; }
function Pagination({ meta, href, params }: { meta: RecapMeta; href: string; params: RecapParams }) {
  const page = (n: number) => { const query = recapQuery(params); query.set("page", String(n)); return `${href}?${query}`; };
  return <nav aria-label="Halaman rekap" className={s.pagination}><span>{meta.total} hasil · Halaman {meta.current_page} dari {meta.last_page}</span><div className={s.actions}>{meta.current_page > 1 && <Link className={s.link} href={page(meta.current_page - 1)}>Sebelumnya</Link>}{meta.current_page < meta.last_page && <Link className={s.link} href={page(meta.current_page + 1)}>Berikutnya</Link>}</div></nav>;
}

export async function TaskRecapIndexPage({ params }: { params: RecapParams }) {
  await requireTanwirAdmin();
  const result = await read(() => getTaskRecaps(params));
  if (!result) return <InvalidFilters href={base} />;
  const query = recapQuery(params);
  return <div className={s.page}>
    <header><h1>Rekap Tugas</h1><p className={s.muted}>Lihat tugas yang diberikan PIC dan hasil peserta pada setiap kelompok.</p></header>
    <form className={s.filters} action={base}>
      <label>Cari tugas<input className={inputClass} name="q" defaultValue={query.get("q") ?? ""} maxLength={200} placeholder="Judul tugas" /></label>
      <label>PIC pembuat tugas<select className={inputClass} name="teacher" defaultValue={query.get("teacher") ?? ""}><option value="">Semua PIC</option>{result.teachers.map(t => <option key={t.id} value={t.id}>{t.name} · {t.code}</option>)}</select></label>
      <label>Kelompok tujuan<select className={inputClass} name="group" defaultValue={query.get("group") ?? ""}><option value="">Semua kelompok</option>{result.groups.map(g => <option key={g.id} value={g.id}>{g.code} · {g.name}</option>)}</select></label>
      <label>Jenis tugas<select className={inputClass} name="type" defaultValue={query.get("type") ?? ""}><option value="">Semua jenis</option>{Object.entries(TASK_TYPE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <div className={s.actions}><Button>Terapkan</Button><Link href={base} className={s.link}>Reset</Link></div>
    </form>
    <p className={s.muted}>Jumlah pengumpulan mencakup seluruh kelompok tujuan tugas. Buka rincian untuk memeriksa peserta per kelompok.</p>
    <div className={s.table}><table><caption className="sr-only">Rekap tugas PIC dan pengumpulan peserta</caption><thead><tr>{["Tugas", "PIC pembuat", "Kelompok tujuan", "Tenggat (WIB)", "Terkumpul", "Menunggu", "Aksi"].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{result.tasks.map(task => <tr key={task.id}>
      <td><Link className={s.link} href={`${base}/${task.id}${query.get("group") ? `?group=${encodeURIComponent(query.get("group")!)}` : ""}`}>{task.title}</Link><div className="mt-2"><TypePill type={task.type} /></div></td>
      <td>{task.teacher?.name ?? "PIC tidak tersedia"}<p className={s.muted}>{task.teacher?.code}</p></td><td>{task.groups.map(g => <p key={g.id}>{g.code} · {g.name}</p>)}</td>
      <td>{formatDateTime(task.deadline)}</td><td>{task.counts.submitted}/{task.counts.participants}<p className={s.muted}>{task.counts.missing} belum mengumpulkan</p></td><td>{task.counts.pending}</td>
      <td><ButtonLink variant="secondary" href={`${base}/${task.id}${query.get("group") ? `?group=${encodeURIComponent(query.get("group")!)}` : ""}`}>Lihat rincian</ButtonLink></td>
    </tr>)}</tbody></table>{!result.tasks.length && <p className={s.empty}>Belum ada tugas yang sesuai filter.</p>}</div>
    <Pagination meta={result.meta} href={base} params={params} />
  </div>;
}

export async function TaskRecapDetailPage({ id, params }: { id: string; params: RecapParams }) {
  await requireTanwirAdmin();
  const result = await read(() => getTaskRecap(id, params));
  const href = `${base}/${encodeURIComponent(id)}`;
  if (!result) return <InvalidFilters href={href} />;
  const { task } = result;
  const query = recapQuery(params, ["group", "q", "status", "page"]);
  return <div className={s.page}>
    <Link className={s.link} href={base}>← Semua rekap tugas</Link>
    <header><TypePill type={task.type} /><h1 className="mt-3">{task.title}</h1><p className={s.muted}>PIC pembuat: {task.teacher?.name ?? "Tidak tersedia"} · Tenggat {formatDateTime(task.deadline)}</p><p className={s.muted}>Kelompok tujuan: {task.groups.map(g => `${g.code} · ${g.name}`).join(", ") || "Belum ada kelompok tujuan"}</p></header>
    <Card><h2 className="mb-3 font-semibold">Perintah tugas</h2><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{task.description}</p></Card>
    {task.type === "quiz" && <details className={s.details}><summary>Soal dan kunci jawaban ({task.questions.length})</summary><div className="mt-4"><QuizReview questions={task.questions} answers={[]} /></div></details>}
    <form className={s.filters} action={href}>
      <label>Kelompok peserta saat ini<select className={inputClass} name="group" defaultValue={query.get("group") ?? ""}><option value="">Semua kelompok</option>{result.groups.map(g => <option key={g.id} value={g.id}>{g.code} · {g.name}</option>)}</select></label>
      <label>Cari peserta<input className={inputClass} name="q" defaultValue={query.get("q") ?? ""} maxLength={200} placeholder="Nama atau kode peserta" /></label>
      <label>Status pengumpulan<select className={inputClass} name="status" defaultValue={query.get("status") ?? ""}><option value="">Semua status</option><option value="missing">Belum mengumpulkan</option><option value="pending">Menunggu koreksi</option><option value="approved">Disetujui</option><option value="rejected">Perlu diulang</option></select></label>
      <div className={s.actions}><Button>Terapkan</Button><Link className={s.link} href={href}>Reset</Link></div>
    </form>
    <Stats counts={result.summary} />
    <p className={s.muted}>Ringkasan mengikuti kelompok yang dipilih, mencakup akun aktif dan nonaktif. Hasil lama tetap ditampilkan meskipun peserta berpindah kelompok; kelompok yang ditampilkan adalah kelompok saat ini.</p>
    <div className={s.table}><table><caption className="sr-only">Hasil setiap peserta untuk {task.title}</caption><thead><tr>{["Peserta", "Kelompok saat ini", "Status", "Nilai", "Percobaan", "Waktu kumpul (WIB)", "Hasil"].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{result.participants.map(member => <tr key={member.id}>
      <td><strong>{member.name}</strong><p className={s.muted}>{member.code}{!member.active && " · Nonaktif"}</p>{!member.currentlyAssigned && <p className={s.muted}>Di luar sasaran saat ini</p>}</td><td>{member.group?.name ?? "Tanpa kelompok"}</td>
      <td>{member.submission ? <SubmissionPill status={member.submission.status} /> : <span>Belum mengumpulkan</span>}</td><td>{member.submission?.score != null ? <ScoreBadge score={member.submission.score} /> : "—"}</td>
      <td>{member.submission?.attemptsCount ?? "—"}</td><td>{member.submission ? <>{formatDateTime(member.submission.submittedAt)}<div className="mt-2"><LatePill late={member.submission.isLate} /></div></> : "—"}</td>
      <td>{member.submission ? <Link className={s.link} href={`${base}/hasil/${member.submission.id}?${query}`}>Lihat hasil</Link> : "Belum ada hasil"}</td>
    </tr>)}</tbody></table>{!result.participants.length && <p className={s.empty}>Tidak ada peserta yang sesuai filter.</p>}</div>
    <Pagination meta={result.meta} href={href} params={Object.fromEntries(query)} />
  </div>;
}

export async function TaskSubmissionRecapPage({ id, params }: { id: string; params: RecapParams }) {
  await requireTanwirAdmin();
  const result = await read(() => getSubmissionRecap(id));
  if (!result) notFound();
  const questions = result.answers.map(a => a.question).filter((q): q is RecapQuestion => q !== null).sort((a, b) => a.order - b.order);
  return <div className={s.page}>
    <Link className={s.link} href={`${base}/${result.task.id}?${recapQuery(params, ["group", "q", "status", "page"])}`}>← Kembali ke {result.task.title}</Link>
    <header><h1>{result.student.name}</h1><p className={s.muted}>{result.student.code} · {result.student.group?.name ?? "Tanpa kelompok"}</p><p className={s.muted}>{result.task.title} · PIC {result.task.teacher?.name ?? "Tidak tersedia"}</p><div className="mt-3 flex flex-wrap items-center gap-3"><SubmissionPill status={result.status} /><LatePill late={result.isLate} />{result.score != null && <ScoreBadge score={result.score} />}</div><p className={s.muted}>Percobaan ke-{result.attemptsCount} · Dikumpulkan {formatDateTime(result.submittedAt)}</p></header>
    <div className={s.split}><div className="min-w-0 space-y-6"><Card><h2 className="mb-4 font-semibold">{result.task.type === "quiz" ? "Jawaban kuis peserta" : "Hasil setoran peserta"}</h2>{result.task.type === "quiz" ? (questions.length ? <QuizReview questions={questions} answers={result.answers} /> : <p className={s.muted}>Rincian jawaban belum tersedia.</p>) : result.files.length ? <SubmissionMedia submission={result} /> : <p className={s.muted}>Berkas setoran tidak tersedia.</p>}</Card><Card><h2 className="mb-3 font-semibold">Perintah tugas</h2><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{result.task.description}</p></Card></div>
      <Card><h2 className="mb-4 font-semibold">Riwayat koreksi</h2><ReviewHistory logs={result.logs} /></Card>
    </div>
  </div>;
}
