"use client";
import { useId, useState } from "react";
export function AudioUploadField() {
  const id = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return <div className="space-y-2 text-sm">
    <label htmlFor={id} className="inline-flex cursor-pointer rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700">Upload audio</label>
    <input id={id} name="audioFile" type="file" accept=".mp3,.wav,.ogg,.m4a" className="sr-only" onChange={event => {
      const file = event.target.files?.[0];
      if (file && file.size > 50 * 1024 * 1024) { event.target.value = ""; setName(""); setError("Audio maksimal 50 MB."); }
      else { setName(file?.name ?? ""); setError(""); }
    }} />
    <p className="text-xs text-gray-500">MP3, WAV, OGG, atau M4A, maksimal 50 MB. Audio diunggah saat materi disimpan dan menggantikan URL audio.</p>
    {name && <p role="status">{name}</p>}{error && <p role="alert" className="text-red-600">{error}</p>}
  </div>;
}
