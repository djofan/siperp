"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MAX_SUBMISSION_BYTES } from "@/modules/ojol/api/policy";
import { Icon } from "@/modules/ojol/components/icons";
import { Notice, buttonClass } from "@/modules/ojol/components/ui";

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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function reset() {
    stopStream();
    setFile(null);
    setPreviewUrl(null);
    setSeconds(0);
    setProgress(0);
    setError("");
    setPhase("idle");
  }

  function switchMode(next: Mode) {
    reset();
    setMode(next);
  }

  function acceptFile(next: File) {
    if (next.size > MAX_SUBMISSION_BYTES) {
      setError("Ukuran file maksimal 50 MB.");
      return;
    }
    setError("");
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setPhase("ready");
  }

  async function startRecording() {
    setError("");
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
        acceptFile(new File([blob], `rekaman.${ext}`, { type: blobType }));
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
    if (!file) return;
    setPhase("uploading");
    setError("");
    const form = new FormData();
    form.set("taskId", taskId);
    form.set("file", file);
    // XHR (bukan fetch) supaya progres unggah bisa ditampilkan untuk file besar.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/ojol/submissions");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body: { error?: string; isLate?: boolean } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        setDone({ isLate: !!body?.isLate });
        router.refresh();
      } else {
        setError(body?.error ?? "Setoran gagal dikirim. Coba lagi.");
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
      <div role="tablist" aria-label="Cara mengirim" className="inline-flex rounded-full bg-ojol-paper p-1 ring-1 ring-ojol-line">
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
              mode === option ? "bg-ojol-surface font-medium text-ojol-ink shadow-sm" : "text-ojol-muted",
            )}
          >
            <Icon name={option === "record" ? (isVideo ? "video" : "mic") : "upload"} className="h-4 w-4" />
            {option === "record" ? "Rekam langsung" : "Unggah file"}
          </button>
        ))}
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      {mode === "record" && phase !== "ready" && phase !== "uploading" && (
        <div className="flex flex-col items-center rounded-2xl bg-ojol-paper px-6 py-10 text-center">
          {isVideo && (
            <video ref={liveRef} muted playsInline className={cn("mb-6 aspect-video w-full max-w-md rounded-xl bg-ojol-ink object-cover", phase !== "recording" && "hidden")} />
          )}
          {phase === "recording" ? (
            <>
              <p className="flex items-center gap-2 text-sm font-medium text-ojol-danger">
                <span className="h-2 w-2 animate-pulse rounded-full bg-ojol-danger" />
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
                className="flex h-20 w-20 items-center justify-center rounded-full bg-ojol-primary text-white transition-transform hover:scale-105 hover:bg-ojol-primary-hover"
              >
                <Icon name={isVideo ? "video" : "mic"} className="h-8 w-8" />
              </button>
              <p className="mt-4 text-sm font-medium">Ketuk untuk mulai merekam</p>
              <p className="mt-1 text-xs text-ojol-muted">Cari tempat yang tenang. Rekaman bisa didengar ulang sebelum dikirim.</p>
            </>
          )}
        </div>
      )}

      {mode === "upload" && phase === "idle" && (
        <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-ojol-line bg-ojol-paper px-6 py-10 text-center transition-colors hover:border-ojol-primary/50">
          <Icon name="upload" className="h-7 w-7 text-ojol-primary" />
          <span className="mt-3 text-sm font-medium">Pilih file {isVideo ? "video" : "audio"}</span>
          <span className="mt-1 text-xs text-ojol-muted">{isVideo ? "MP4, WEBM, atau MOV" : "MP3, WAV, OGG, M4A, atau WEBM"} · maksimal 50 MB</span>
          <input
            type="file"
            accept={isVideo ? "video/mp4,video/webm,video/quicktime" : "audio/*"}
            className="sr-only"
            onChange={(event) => {
              const picked = event.target.files?.[0];
              if (picked) acceptFile(picked);
              event.target.value = "";
            }}
          />
        </label>
      )}

      {(phase === "ready" || phase === "uploading") && previewUrl && file && (
        <div className="space-y-4 rounded-2xl bg-ojol-paper p-4 sm:p-5">
          <p className="text-sm font-medium">Pratinjau sebelum dikirim</p>
          {isVideo ? (
            <video src={previewUrl} controls playsInline className="aspect-video w-full rounded-xl bg-ojol-ink" />
          ) : (
            <audio src={previewUrl} controls className="w-full" />
          )}
          <p className="text-xs text-ojol-muted">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
          {phase === "uploading" ? (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-ojol-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-ojol-primary transition-[width]" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-ojol-muted">Mengunggah… {progress}%</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={submit} className={buttonClass("primary", "h-12 px-6")}>
                <Icon name="check" className="h-4 w-4" />
                {resubmit ? "Kirim ulang setoran" : "Kirim setoran"}
              </button>
              <button type="button" onClick={reset} className={buttonClass("secondary", "h-12")}>
                {mode === "record" ? "Rekam ulang" : "Ganti file"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
