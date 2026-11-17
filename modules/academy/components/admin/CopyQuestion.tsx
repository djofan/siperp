"use client";

import { useState } from "react";

export function CopyQuestion({ text }: { text: string }) {
  const [message, setMessage] = useState("");
  return <div className="mt-4"><button type="button" className="rounded-xl border border-green-700 px-4 py-2 text-sm font-semibold text-green-700" onClick={async () => {
    try { await navigator.clipboard.writeText(text); setMessage("Pertanyaan disalin. Silakan teruskan secara manual kepada ustadz."); }
    catch { setMessage("Belum dapat menyalin otomatis. Pilih teks pertanyaan lalu salin secara manual."); }
  }}>Salin pertanyaan untuk ustadz</button>{message && <p role="status" className="mt-2 text-sm text-gray-600">{message}</p>}</div>;
}
