"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MAX_SUBMISSION_BYTES } from "@/modules/tanwir/api/policy";
import { Icon } from "@/modules/tanwir/components/icons";
import { Notice, buttonClass } from "@/modules/tanwir/components/ui";

type Mode = "record" | "upload";
type Phase = "idle" | "recording" | "ready" | "uploading";

const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const VIDEO_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];

function pickMimeType(video: boolean): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return (video ? VIDEO_TYPES : AUDIO_TYPES).find((type) => MediaRecorder.isTypeSupported(type));
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MediaSubmit({ taskId, type, resubmit }: { taskId: string; type: "voice_note" | "video"; resubmit: boolean }) {
  const router = useRouter();
  const isVideo = type === "video";
  const [mode, setMode] = useState<Mode>("record");
  const [phase, setPhase] = useState<Phase>("idle");
  const [items, setItems] = useState<{id:string;file:File;url:string}[]>([]);
  const urls = useRef(new Set<string>());
  const [seconds, setSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ isLate: boolean } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const liveRef = useRef<HTMLVideoElement | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);
  useEffect(() => {
    const previews=urls.current;
    return()=>{for (const url of previews) URL.revokeObjectURL(url);};
  }, []);

  function reset() {
    stopStream();
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
    setItems([]);
    setSeconds(0);
    setProgress(0);
    setError("");
    setPhase("idle");
  }

  function switchMode(next: Mode) {
    stopStream();
    setPhase("idle");
    setError("");
    setMode(next);
  }

  function acceptFiles(next: File[]) {
    if (items.length + next.length > 10) {setError("Maksimal 10 file dalam satu setoran.");return;}
    if (next.some(file=>file.type && !file.type.startsWith(isVideo?"video/":"audio/"))) {setError("Pilih file yang sesuai tipe tugas.");return;}
    if ([...items.map(item=>item.file),...next].reduce((sum,file)=>sum+file.size,0)>MAX_SUBMISSION_BYTES) {setError("Total ukuran semua file maksimal 50 MB.");setPhase("idle");return;}
    const added=next.map(file=>{const url=URL.createObjectURL(file);urls.current.add(url);return {id:crypto.randomUUID(),file,url};});
    setItems(current=>[...current,...added]);setError("");setPhase("ready");
  }
  function removeFile(id:string){
    const item=items.find(item=>item.id===id);
    if(item){URL.revokeObjectURL(item.url);urls.current.delete(item.url);}
    setItems(current=>current.filter(item=>item.id!==id));
    if(items.length===1)setPhase("idle");
  }

  async function startRecording() {
    setError("");
    if(items.length>=10){setError("Maksimal 10 file. Hapus salah satu sebelum merekam lagi.");return;}
    const mimeType = pickMimeType(isVideo);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Browser ini belum mendukung perekaman. Gunakan tombol Unggah file.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: isVideo ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
      streamRef.current = stream;
      if (isVideo && liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play().catch(() => undefined);
      }
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blobType = recorder.mimeType || mimeType || (isVideo ? "video/webm" : "audio/webm");
        const ext = blobType.includes("mp4") ? "mp4" : blobType.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        stopStream();
        acceptFiles([new File([blob], `rekaman-${items.length+1}.${ext}`, { type: blobType })]);
      };
      recorder.start(1000);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
      setPhase("recording");
    } catch {
      stopStream();
      setError("Izin mikrofon" + (isVideo ? "/kamera" : "") + " ditolak atau perangkat tidak ditemukan. Izinkan akses di pengaturan browser, atau unggah file.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function submit() {
    if (!items.length) return;
    setPhase("uploading");
    setError("");
    const form = new FormData();
    form.set("taskId", taskId);
    for (const item of items) form.append("files[]", item.file);
    // XHR (bukan fetch) supaya progres unggah bisa ditampilkan untuk file besar.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/tanwir/submissions");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body: { error?: string | { message?: string }; isLate?: boolean } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        setDone({ isLate: !!body?.isLate });
        router.refresh();
      } else {
        setError(typeof body?.error === "string" ? body.error : body?.error?.message ?? "Setoran gagal dikirim. Coba lagi.");
        setPhase("ready");
      }
    };
    xhr.onerror = () => {
      setError("Koneksi terputus saat mengunggah. Coba lagi.");
      setPhase("ready");
    };
    xhr.send(form);
  }

  if (done) {
    return (
      <Notice tone="success">
        Setoran terkirim. {done.isLate ? "Dikumpulkan setelah tenggat awal, jadi ditandai terlambat. " : ""}Tunggu koreksi dari guru.
      </Notice>
    );
  }

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Cara mengirim" className="inline-flex rounded-full bg-tanwir-paper p-1 ring-1 ring-tanwir-line">
        {(["record", "upload"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={mode === option}
            disabled={phase === "recording" || phase === "uploading"}
            onClick={() => switchMode(option)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
              mode === option ? "bg-tanwir-surface font-medium text-tanwir-ink shadow-sm" : "text-tanwir-muted",
            )}
          >
            <Icon name={option === "record" ? (isVideo ? "video" : "mic") : "upload"} className="h-4 w-4" />
            {option === "record" ? "Rekam langsung" : "Unggah file"}
          </button>
        ))}
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      {mode === "record" && phase !== "ready" && phase !== "uploading" && (
        <div className="flex flex-col items-center rounded-2xl bg-tanwir-paper px-6 py-10 text-center">
          {isVideo && (
            <video ref={liveRef} muted playsInline className={cn("mb-6 aspect-video w-full max-w-md rounded-xl bg-tanwir-ink object-cover", phase !== "recording" && "hidden")} />
          )}
          {phase === "recording" ? (
            <>
              <p className="flex items-center gap-2 text-sm font-medium text-tanwir-danger">
                <span className="h-2 w-2 animate-pulse rounded-full bg-tanwir-danger" />
                Merekam
              </p>
              <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">{formatDuration(seconds)}</p>
              <button type="button" onClick={stopRecording} className={buttonClass("danger", "mt-6 h-12 px-6")}>
                <Icon name="stop" className="h-4 w-4" />
                Selesai merekam
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startRecording}
                aria-label="Mulai merekam"
                className="flex h-20 w-20 items-center justify-center rounded-full bg-tanwir-primary text-white transition-transform hover:scale-105 hover:bg-tanwir-primary-hover"
              >
                <Icon name={isVideo ? "video" : "mic"} className="h-8 w-8" />
              </button>
              <p className="mt-4 text-sm font-medium">Ketuk untuk mulai merekam</p>
              <p className="mt-1 text-xs text-tanwir-muted">Cari tempat yang tenang. Rekaman bisa didengar ulang sebelum dikirim.</p>
            </>
          )}
        </div>
      )}

      {mode === "upload" && phase !== "uploading" && (
        <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-tanwir-line bg-tanwir-paper px-6 py-10 text-center transition-colors hover:bg-tanwir-primary-soft">
          <Icon name="upload" className="h-7 w-7 text-tanwir-primary" />
          <span className="mt-3 text-sm font-medium">Tambah file {isVideo ? "video" : "audio"}</span>
          <span className="mt-1 text-xs text-tanwir-muted">{isVideo ? "MP4, WEBM, atau MOV" : "MP3, WAV, OGG, M4A, atau WEBM"} · maksimal 50 MB</span>
          <input
            type="file"
            multiple
            accept={isVideo ? "video/mp4,video/webm,video/quicktime" : "audio/*"}
            className="sr-only"
            onChange={(event) => {
              const picked = Array.from(event.target.files??[]);
              if (picked.length) acceptFiles(picked);
              event.target.value = "";
            }}
          />
        </label>
      )}

      {items.length>0 && (
        <div className="space-y-4 rounded-2xl bg-tanwir-paper p-4 sm:p-5">
          <p className="text-sm font-medium">{items.length}/10 file - {(items.reduce((sum,item)=>sum+item.file.size,0)/1024/1024).toFixed(1)} / 50 MB</p>
          <p className="text-xs text-tanwir-muted">Periksa semua file sebelum dikirim. Guru akan menerima seluruh file sebagai satu setoran.</p>
          {items.map((item,index)=><div key={item.id} className="space-y-2 rounded-xl bg-tanwir-surface p-3">
            <div className="flex min-w-0 items-center justify-between gap-3"><p className="min-w-0 break-all text-sm">{index+1}. {item.file.name}</p><button type="button" disabled={phase==="uploading"||phase==="recording"} onClick={()=>removeFile(item.id)} className={buttonClass("secondary","shrink-0")} aria-label={`Hapus ${item.file.name}`}>Hapus</button></div>
            {isVideo?<video src={item.url} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-tanwir-ink"/>:<audio src={item.url} controls preload="metadata" className="w-full"/>}
          </div>)}
          {phase === "uploading" ? (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-tanwir-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-tanwir-primary transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-tanwir-muted">Mengunggah… {progress}%</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mode==="record"&&<button type="button" disabled={phase==="recording"||items.length>=10} onClick={()=>setPhase("idle")} className={buttonClass("secondary","h-12")}>Tambah rekaman</button>}
              <button type="button" onClick={submit} disabled={phase==="recording"} className={buttonClass("primary", "h-12 px-6")}>
                <Icon name="check" className="h-4 w-4" />
                {resubmit ? "Kirim ulang setoran" : "Kirim setoran"}
              </button>
              <button type="button" onClick={reset} disabled={phase==="recording"} className={buttonClass("secondary", "h-12")}>
                Hapus semua
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
