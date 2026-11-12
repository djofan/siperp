"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "./ui";

const MAX_BYTES = 50 * 1024 * 1024;

export function TeacherAudioField({ existingUrl = "" }: { existingUrl?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const [mode, setMode] = useState<"upload" | "record">("upload");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const form = input.current?.form;
    const prevent = (event: Event) => {
      if (recording || busy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setMessage("Hentikan rekaman sebelum menyimpan materi.");
      }
    };
    form?.addEventListener("submit", prevent, true);
    return () => form?.removeEventListener("submit", prevent, true);
  }, [recording, busy]);

  function select(file?: File) {
    setMessage("");
    if (file && file.size > MAX_BYTES) {
      if (input.current) input.current.value = "";
      setPreview("");
      setMessage("Audio maksimal 50 MB. Pilih file atau rekam ulang.");
      return;
    }
    setPreview(file ? URL.createObjectURL(file) : "");
  }

  async function start() {
    setMessage("");
    setBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Perekaman tidak tersedia. Gunakan HTTPS/localhost atau unggah file audio.");
      const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/ogg"].find(type => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("Browser ini belum mendukung format rekaman. Gunakan unggah file audio.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const current = new MediaRecorder(media, { mimeType: mime });
      recorder.current = current;
      const parts: Blob[] = [];
      let size = 0;
      let oversized = false;
      current.ondataavailable = event => {
        size += event.data.size;
        if (size > MAX_BYTES) { oversized = true; if (current.state === "recording") current.stop(); }
        else parts.push(event.data);
      };
      current.onstop = () => {
        media.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        setRecording(false);
        if (oversized) { setMessage("Rekaman melebihi 50 MB. Rekam ulang lebih singkat."); return; }
        const extension = mime.includes("ogg") ? "ogg" : "webm";
        const file = new File(parts, "rekaman-materi." + extension, { type: mime });
        if (!file.size) { setMessage("Rekaman kosong. Silakan rekam ulang."); return; }
        const transfer = new DataTransfer();
        transfer.items.add(file);
        if (input.current) input.current.files = transfer.files;
        select(file);
      };
      current.onerror = () => { media.getTracks().forEach(track => track.stop()); setRecording(false); setMessage("Perekaman gagal. Coba ulang atau unggah file."); };
      if (input.current) input.current.value = "";
      setPreview("");
      current.start(1000);
      setRecording(true);
    } catch (error) {
      stream.current?.getTracks().forEach(track => track.stop());
      setMessage(error instanceof Error ? error.message : "Mikrofon tidak dapat diakses.");
    } finally { setBusy(false); }
  }

  return <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4">
    <legend className="px-1 text-sm font-medium">Audio materi (opsional)</legend>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={recording || busy} aria-pressed={mode === "upload"} onClick={() => setMode("upload")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Unggah file</button>
      <button type="button" disabled={recording || busy} aria-pressed={mode === "record"} onClick={() => setMode("record")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Rekam langsung</button>
    </div>
    <label className={mode === "upload" ? "block text-sm" : "sr-only"}>Pilih file audio
      <input ref={input} name="file" type="file" accept=".mp3,.wav,.ogg,.m4a,.webm" disabled={recording || busy} className={inputClass} onChange={event => select(event.target.files?.[0])} />
    </label>
    {mode === "record" && <div className="space-y-2">
      <button type="button" disabled={busy} onClick={recording ? () => recorder.current?.stop() : start} className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? "Mengakses mikrofon..." : recording ? "Hentikan rekaman" : "Mulai rekam"}</button>
      {recording && <p role="status" className="text-sm text-red-700">Sedang merekam. Hentikan rekaman sebelum menyimpan materi.</p>}
    </div>}
    <p className="text-xs text-gray-500">MP3, WAV, OGG, M4A, atau WebM, maksimal 50 MB. Audio disimpan bersama materi. Jika tidak memilih audio baru, audio sebelumnya tetap digunakan.</p>
    {(preview || existingUrl) && <audio controls src={preview || existingUrl} className="w-full" />}
    {preview && <p className="text-xs text-gray-600">Audio baru siap disimpan.</p>}
    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
  </fieldset>;
}
