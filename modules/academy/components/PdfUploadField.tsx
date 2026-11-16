"use client";

import { useId, useState } from "react";

export function PdfUploadField() {
  const id = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return <div className="space-y-2 text-sm">
    <label htmlFor={id} className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700">Upload PDF</label>
    <input id={id} name="pdfFile" type="file" accept=".pdf,application/pdf" className="sr-only" onChange={event => {
      const file = event.target.files?.[0];
      if (file && file.size > 10 * 1024 * 1024) {
        event.target.value = ""; setName(""); setError("PDF maksimal 10 MB.");
      } else { setName(file?.name ?? ""); setError(""); }
    }} />
    <p className="text-xs text-gray-500">PDF maksimal 10 MB. Disimpan sebagai lampiran saat materi disimpan. Total audio dan PDF maksimal 50 MB.</p>
    {name && <p role="status" className="break-words">{name}</p>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
  </div>;
}
