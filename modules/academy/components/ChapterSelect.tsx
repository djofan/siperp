"use client";

import { useState } from "react";
import { inputClass } from "./ui";

type ChapterOption = { id: string; title: string; course: { id: string; title: string } };

export function ChapterSelect({ chapters, requireChapter = true }: { chapters: ChapterOption[]; requireChapter?: boolean }) {
  const [courseId, setCourseId] = useState("");
  const courses = Array.from(new Map(chapters.map(chapter => [chapter.course.id, chapter.course])).values());
  const available = chapters.filter(chapter => chapter.course.id === courseId);

  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="block text-sm">Angkatan
      <select name="courseId" required value={courseId} onChange={event => setCourseId(event.target.value)} className={inputClass}>
        <option value="">Pilih angkatan</option>
        {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
      </select>
    </label>
    {requireChapter && <label className="block text-sm">Bab
      <select key={courseId} name="chapterId" required defaultValue="" disabled={!courseId} className={inputClass}>
        <option value="">{courseId ? "Pilih bab" : "Pilih angkatan terlebih dahulu"}</option>
        {available.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
      </select>
    </label>}
  </div>;
}
