import { AcademyError } from "./errors";
import { orderField, textField } from "./admin-validation";

function integer(form: FormData, key: string, label: string, min: number, max: number) {
  const value = orderField(form, key, label);
  if (value < min || value > max) throw new AcademyError(`${label} harus antara ${min} dan ${max}.`);
  return value;
}

export function quizDateInput(date: Date | null) {
  return date ? new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16) : "";
}

export function quizInput(form: FormData) {
  const rawDate = textField(form, "quizDate", "Jadwal", 16, false);
  let quizDate: Date | null = null;
  if (rawDate) {
    quizDate = new Date(rawDate + ":00+07:00");
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawDate) || Number(rawDate.slice(0, 4)) < 1000
      || !Number.isFinite(quizDate.getTime()) || quizDateInput(quizDate) !== rawDate) {
      throw new AcademyError("Jadwal WIB tidak valid.");
    }
  }
  const isPublished = form.get("isPublished") === "on";
  const rawKind = textField(form, "kind", "Jenis evaluasi", 20, false) || "DAILY";
  if (rawKind !== "DAILY" && rawKind !== "WEEKLY" && rawKind !== "FINAL") throw new AcademyError("Jenis evaluasi tidak valid.");
  const kind: "DAILY" | "WEEKLY" | "FINAL" = rawKind;
  const rawClose = textField(form, "closesAt", "Batas evaluasi", 16, false);
  const closesAt = rawClose ? new Date(rawClose + ":00+07:00") : null;
  if (closesAt && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawClose) || !Number.isFinite(closesAt.getTime()) || quizDateInput(closesAt) !== rawClose || (quizDate && closesAt <= quizDate))) throw new AcademyError("Batas evaluasi WIB harus valid dan setelah waktu buka.");
  const isActive = form.get("isActive") === "on";
  if (isActive && !isPublished) throw new AcademyError("Publikasikan kuis sebelum mengaktifkannya.");
  return {
    releaseDay: form.has("releaseDay") ? integer(form, "releaseDay", "Hari evaluasi", 1, 30) : 1,
    title: textField(form, "title", "Judul"),
    description: textField(form, "description", "Deskripsi", 30000, false) || null,
    passingScore: integer(form, "passingScore", "Nilai lulus", 0, 100),
    timeLimitMinutes: integer(form, "timeLimitMinutes", "Durasi", 1, 1440),
    isPublished, isActive, quizDate, closesAt, kind, allowRetake: form.get("allowRetake") === "on",
  };
}

export type QuizOptionInput = { id: string; label: string; isCorrect: boolean };

export function questionInput(form: FormData) {
  const rawType = textField(form, "type", "Jenis soal", 20, false) || "SINGLE";
  if (rawType !== "SINGLE" && rawType !== "TRUE_FALSE" && rawType !== "MULTIPLE") throw new AcademyError("Jenis soal tidak valid.");
  const type: "SINGLE" | "TRUE_FALSE" | "MULTIPLE" = rawType;
  const weight = form.has("weight") ? integer(form, "weight", "Bobot", 1, 100) : 1;
  const question = textField(form, "question", "Pertanyaan", 10000);
  const order = orderField(form);
  const raw = textField(form, "options", "Opsi", 60000);
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new AcademyError("Opsi jawaban tidak valid."); }
  if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > 10) throw new AcademyError("Sediakan 2 sampai 10 opsi jawaban.");
  const options: QuizOptionInput[] = parsed.map((value: unknown) => {
    if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "string" || value.id.length > 191
      || !("label" in value) || typeof value.label !== "string"
      || !("isCorrect" in value) || typeof value.isCorrect !== "boolean") throw new AcademyError("Opsi jawaban tidak valid.");
    const label = value.label.trim();
    if (!label || label.length > 4000) throw new AcademyError("Setiap opsi wajib diisi, maksimal 4000 karakter.");
    return { id: value.id, label, isCorrect: value.isCorrect };
  });
  const correct = options.filter(option => option.isCorrect).length;
  if (type === "MULTIPLE" ? correct < 1 || correct >= options.length : correct !== 1) throw new AcademyError(type === "MULTIPLE" ? "Pilih satu atau lebih jawaban benar dan sisakan minimal satu pengecoh." : "Pilih tepat satu jawaban benar.");
  if (type === "TRUE_FALSE" && (options.length !== 2 || !["benar", "salah"].every(label => options.some(option => option.label.toLowerCase() === label)))) throw new AcademyError("Soal benar/salah harus memiliki opsi Benar dan Salah.");
  const ids = options.filter(option => option.id).map(option => option.id);
  if (new Set(ids).size !== ids.length) throw new AcademyError("ID opsi tidak boleh berulang.");
  if (new Set(options.map(option => option.label.toLocaleLowerCase("id-ID"))).size !== options.length) throw new AcademyError("Teks setiap opsi harus berbeda.");
  return { question, order, options, type, weight, explanation: textField(form, "explanation", "Pembahasan", 10000, false) || null };
}
