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
  const isActive = form.get("isActive") === "on";
  if (isActive && !isPublished) throw new AcademyError("Publikasikan kuis sebelum mengaktifkannya.");
  return {
    title: textField(form, "title", "Judul"),
    description: textField(form, "description", "Deskripsi", 30000, false) || null,
    passingScore: integer(form, "passingScore", "Nilai lulus", 0, 100),
    timeLimitMinutes: integer(form, "timeLimitMinutes", "Durasi", 1, 1440),
    isPublished, isActive, quizDate, allowRetake: form.get("allowRetake") === "on",
  };
}

export type QuizOptionInput = { id: string; label: string; isCorrect: boolean };

export function questionInput(form: FormData) {
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
  if (options.filter(option => option.isCorrect).length !== 1) throw new AcademyError("Pilih tepat satu jawaban benar.");
  const ids = options.filter(option => option.id).map(option => option.id);
  if (new Set(ids).size !== ids.length) throw new AcademyError("ID opsi tidak boleh berulang.");
  if (new Set(options.map(option => option.label.toLocaleLowerCase("id-ID"))).size !== options.length) throw new AcademyError("Teks setiap opsi harus berbeda.");
  return { question, order, options };
}
