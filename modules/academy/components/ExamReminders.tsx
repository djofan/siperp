import Link from "next/link";
import type { getExamNotifications } from "../api/notifications";
import { markReminderRead } from "../api/notification-actions";
import { ActionForm } from "./ActionForm";
export function ExamReminders({ items, compact = false }: { items: Awaited<ReturnType<typeof getExamNotifications>>; compact?: boolean }) {
  const labels = { upcoming: "Segera dibuka", due: "Batas ujian kurang dari 24 jam", open: "Ujian tersedia", missed: "Batas ujian terlewat" };
  return <div className="space-y-3">{(compact ? items.slice(0,3) : items).map(item => <article key={item.key} className={`rounded-xl border p-4 ${item.read ? "border-gray-100 bg-white" : "border-green-200 bg-green-50"}`}><p className="text-xs font-semibold text-green-700">{labels[item.state]}</p><Link href={`/academy/kuis/${item.quizId}`} className="mt-2 block font-medium">{item.title} →</Link><p className="mt-1 text-xs text-gray-500">{item.course}</p><p className="mt-2 text-sm">{item.state === "upcoming" ? "Buka" : item.closesAt ? "Tutup" : "Dibuka"}: {(item.state === "upcoming" ? item.opensAt : item.closesAt ?? item.opensAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>{!compact && !item.read && <ActionForm className="mt-3" action={markReminderRead.bind(null,item.key)} label="Tandai sudah dibaca" />}</article>)}</div>;
}
