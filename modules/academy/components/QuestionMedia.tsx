import Image from "next/image";

export type QuestionMediaValue = { id: string; mediaMime?: string | null; mediaName?: string | null; mediaAlt?: string | null };

export function QuestionMedia({ question, className = "" }: { question: QuestionMediaValue; className?: string }) {
  if (!question.mediaMime) return null;
  const src = `/api/academy/questions/${encodeURIComponent(question.id)}/media`;
  if (question.mediaMime.startsWith("image/")) {
    return <div className={`relative min-h-48 w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50 ${className}`}>
      <Image src={src} alt={question.mediaAlt?.trim() || "Ilustrasi soal"} width={1200} height={800} unoptimized className="h-auto max-h-[32rem] w-full object-contain"/>
    </div>;
  }
  if (question.mediaMime.startsWith("audio/")) {
    return <div className={`rounded-xl border border-gray-100 bg-gray-50 p-4 ${className}`}>
      <p className="mb-2 text-xs text-gray-500">Audio soal{question.mediaName ? ` · ${question.mediaName}` : ""}</p>
      <audio controls preload="metadata" src={src} className="w-full">Browser Anda tidak mendukung pemutar audio.</audio>
    </div>;
  }
  return null;
}
