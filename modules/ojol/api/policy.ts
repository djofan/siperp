// Aturan bisnis murni Ojol Mengaji (docs/prd-ojol.md, mengikuti prd-tanwir §6) — tanpa akses database,
// supaya bisa diuji unit dan dipakai di server maupun client.

export type TaskType = "voice_note" | "video" | "quiz";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type QuizOption = "a" | "b" | "c" | "d";

export const QUIZ_OPTIONS: readonly QuizOption[] = ["a", "b", "c", "d"];
export const MAX_SUBMISSION_BYTES = 50 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const EXTEND_HOURS_MIN = 1;
export const EXTEND_HOURS_MAX = 72;

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  voice_note: "Voice note",
  video: "Video",
  quiz: "Kuis",
};

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: "Menunggu koreksi",
  approved: "Disetujui",
  rejected: "Perlu diulang",
};

// Kode akun: G/P + OM + 3 digit (GOM001, POM001); kelompok: OM + 3 digit (OM001).
export const CODE_PREFIX = { guru: "GOM", peserta: "POM", group: "OM" } as const;

export function formatCode(prefix: string, sequence: number): string {
  return prefix + String(sequence).padStart(3, "0");
}

/** Kode berikutnya yang belum dipakai, mulai dari jumlah data + 1 (pola aplikasi lama). */
export function nextAvailableCode(prefix: string, existingCount: number, taken: ReadonlySet<string>): string {
  let sequence = existingCount;
  let code: string;
  do {
    sequence += 1;
    code = formatCode(prefix, sequence);
  } while (taken.has(code));
  return code;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** §6.2 — tugas terkunci begitu waktu sekarang melewati tenggat (yang mungkin sudah diperpanjang). */
export function isTaskLocked(deadline: Date, now: Date = new Date()): boolean {
  return now.getTime() > deadline.getTime();
}

/** §6.4 — terlambat = dikumpulkan setelah tenggat AWAL, termasuk di masa perpanjangan. */
export function isLateSubmission(originalDeadline: Date, now: Date = new Date()): boolean {
  return now.getTime() > originalDeadline.getTime();
}

/** §6.3 — perpanjangan dihitung dari sekarang, bukan dari tenggat lama. */
export function extendedDeadline(hours: number, now: Date = new Date()): Date {
  if (!Number.isInteger(hours) || hours < EXTEND_HOURS_MIN || hours > EXTEND_HOURS_MAX) {
    throw new RangeError(`Perpanjangan harus ${EXTEND_HOURS_MIN}–${EXTEND_HOURS_MAX} jam.`);
  }
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

/** §6.8 — nilai kuis = round(benar / total × 100). */
export function quizScore(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export type ScoreTone = "good" | "fair" | "low";
export function scoreTone(score: number): ScoreTone {
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "low";
}

export type StudentTaskState = "todo" | "pending" | "rejected" | "approved" | "locked";

/**
 * Status tugas dari sudut pandang peserta. Tugas terkunci hanya relevan bila belum
 * ada pengumpulan yang bisa dilanjutkan (belum mengerjakan / perlu diulang).
 */
export function studentTaskState(submissionStatus: SubmissionStatus | null, locked: boolean): StudentTaskState {
  if (submissionStatus === "pending") return "pending";
  if (submissionStatus === "approved") return "approved";
  if (locked) return "locked";
  return submissionStatus === "rejected" ? "rejected" : "todo";
}

/** §6.5 — peserta boleh (re)submit hanya bila belum pernah, atau terakhir ditolak, dan belum terkunci. */
export function canSubmit(submissionStatus: SubmissionStatus | null, locked: boolean, type: TaskType): boolean {
  if (locked) return false;
  if (type === "quiz") return submissionStatus === null; // §6.8 kuis sekali saja
  return submissionStatus === null || submissionStatus === "rejected";
}

// §6.10 — tipe file dideteksi dari isi (magic bytes), bukan ekstensi/MIME kiriman browser.
export type MediaKind = "audio" | "video" | "image";
export interface DetectedFile {
  mime: string;
  ext: string;
  kind: MediaKind;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

export function detectMediaFile(bytes: Uint8Array): DetectedFile | null {
  if (bytes.length < 12) return null;
  // WebM / Matroska (MediaRecorder Chrome/Firefox). Video vs audio dibedakan dari konteks tugas.
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { mime: "video/webm", ext: "webm", kind: "video" };
  }
  if (ascii(bytes, 0, 4) === "OggS") return { mime: "audio/ogg", ext: "ogg", kind: "audio" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WAVE") return { mime: "audio/wav", ext: "wav", kind: "audio" };
  if (ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (brand === "M4A " || brand === "M4B ") return { mime: "audio/mp4", ext: "m4a", kind: "audio" };
    if (brand === "qt  ") return { mime: "video/quicktime", ext: "mov", kind: "video" };
    // Safari MediaRecorder & sebagian besar MP4 (isom, mp42, avc1, iso5, dll).
    return { mime: "video/mp4", ext: "mp4", kind: "video" };
  }
  if (ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
    return { mime: "audio/mpeg", ext: "mp3", kind: "audio" };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg", kind: "image" };
  if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG") return { mime: "image/png", ext: "png", kind: "image" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp", kind: "image" };
  return null;
}

/**
 * Apakah file cocok untuk tipe tugas. Rekaman WebM/MP4 dari browser bisa berisi audio saja,
 * jadi untuk voice note kontainer video (webm/mp4) tetap diterima.
 */
export function fileMatchesTask(file: DetectedFile, type: TaskType): boolean {
  if (type === "voice_note") return file.kind === "audio" || file.ext === "webm" || file.ext === "mp4";
  if (type === "video") return file.kind === "video";
  return false;
}

/** Nomor HP Indonesia → format internasional tanpa simbol untuk wa.me (0812… → 62812…). */
export function toWhatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

/** §5.4 — pesan pengingat WhatsApp ke guru yang punya setoran menunggu koreksi. */
export function reviewReminderMessage(teacherName: string, taskTitle: string, pending: number): string {
  return (
    `Assalamu'alaikum Ustadz/Ustadzah ${teacherName},\n\n` +
    `Ada *${pending} setoran* yang menunggu koreksi untuk tugas:\n*"${taskTitle}"*\n\n` +
    "Mohon segera diperiksa. Jazakallahu khairan."
  );
}

export function placeholderEmail(code: string): string {
  return `${code.toLowerCase()}@ojol.invalid`;
}
