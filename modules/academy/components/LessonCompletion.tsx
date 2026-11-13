"use client";
import { useEffect, useState, useTransition } from "react";
import { markLesson, visitLesson } from "../api/actions";
export function LessonCompletion({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  useEffect(() => { void visitLesson(lessonId); }, [lessonId]);
  const [done, setDone] = useState(completed);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <section className="mt-6 rounded-xl border bg-green-50 p-4"><p className="mb-3 text-sm">{done ? "✓ Materi sudah ditandai selesai." : "Selesai membaca atau mendengarkan? Tandai materi ini untuk memperbarui progres Anda."}</p>
    <button disabled={pending} className="min-h-11 rounded-xl bg-green-700 px-4 py-3 text-sm font-medium text-white disabled:opacity-50" onClick={() => startTransition(async () => {
      setError(""); const result = await markLesson(lessonId, !done);
      if (result.error) setError(result.error); else setDone(!done);
    })}>{pending ? "Menyimpan…" : done ? "Tandai belum selesai" : "Tandai selesai"}</button>{error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
  </section>;
}
