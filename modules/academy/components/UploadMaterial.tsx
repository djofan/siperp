"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function UploadMaterial({ lessonId }: { lessonId: string }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const router = useRouter();
  return <form className="mt-5 rounded-xl bg-green-50 p-4" onSubmit={async event => {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setMessage("");
    try { const response = await fetch("/api/academy/upload", { method: "POST", body: new FormData(form) }); const result = await response.json(); setMessage(result.message ?? result.error); if (response.ok) { if (result.isAudio) { const audioInput = form.closest("details")?.querySelector<HTMLInputElement>('input[name="videoUrl"]'); if (audioInput) audioInput.value = result.fileUrl; } form.reset(); router.refresh(); } }
    catch { setMessage("Upload gagal. Coba kembali."); } finally { setBusy(false); }
  }}><input type="hidden" name="lessonId" value={lessonId} /><label className="block text-sm font-medium">Upload audio / PDF<input name="file" type="file" required accept=".mp3,.wav,.ogg,.m4a,.pdf" className="mt-3 block w-full text-sm" /></label><p className="mt-2 text-xs text-gray-500">Audio maksimal 50 MB; PDF maksimal 10 MB. Audio mengganti sumber pemutar; PDF menjadi lampiran.</p><button disabled={busy} className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Mengunggah…" : "Upload file"}</button>{message && <p role="status" className="mt-3 text-sm">{message}</p>}</form>;
}
