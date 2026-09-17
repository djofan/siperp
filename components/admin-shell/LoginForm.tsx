"use client";

import { useState, type FormEvent, type SVGProps } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a15.6 15.6 0 0 1-3.4 4.3M6.3 6.3C3.7 8 2 12 2 12s3.6 7 10 7c1.4 0 2.6-.3 3.7-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SpinnerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

const inputBaseClasses =
  "h-12 w-full rounded-xl border bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:bg-white/[0.08] " +
  "[&:-webkit-autofill]:[-webkit-text-fill-color:#fff]! [&:-webkit-autofill]:[caret-color:#fff]! [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s]! [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_rgba(255,255,255,0.06)_inset]!";

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotNote, setShowForgotNote] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!email) errors.email = "Email wajib diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Format email tidak valid.";
    if (!password) errors.password = "Password wajib diisi.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Email atau password salah.");
      return;
    }

    const redirectTo = searchParams.get("from") || "/admin";
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-[#73AE43] uppercase">Masuk ke Dashboard</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Selamat datang kembali.</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-[#B8BCC4]" />
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="nama@email.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
              }}
              className={cn(
                inputBaseClasses,
                fieldErrors.email ? "border-[#E5484D] focus:border-[#E5484D]" : "border-white/15 focus:border-[#73AE43]"
              )}
            />
          </div>
          {fieldErrors.email && <p className="mt-1.5 text-xs text-[#E5484D]">{fieldErrors.email}</p>}
        </div>

        <div>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-[#B8BCC4]" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
              }}
              className={cn(
                inputBaseClasses,
                "pr-11",
                fieldErrors.password ? "border-[#E5484D] focus:border-[#E5484D]" : "border-white/15 focus:border-[#73AE43]"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#B8BCC4] transition-colors hover:text-white"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOffIcon className="h-4.5 w-4.5" /> : <EyeIcon className="h-4.5 w-4.5" />}
            </button>
          </div>
          {fieldErrors.password && <p className="mt-1.5 text-xs text-[#E5484D]">{fieldErrors.password}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="inline-flex cursor-pointer items-center gap-2 select-none">
            <span
              className={cn(
                "relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                remember ? "border-[#73AE43] bg-[#73AE43]" : "border-white/25 bg-white/5"
              )}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {remember && <CheckIcon className="h-3 w-3 text-white" />}
            </span>
            <span className="text-sm text-[#B8BCC4]">Ingat saya</span>
          </label>
          <button
            type="button"
            onClick={() => setShowForgotNote((v) => !v)}
            className="text-sm font-medium text-[#73AE43] transition-colors hover:text-[#8fca66]"
          >
            Lupa password?
          </button>
        </div>
        {showForgotNote && (
          <p className="-mt-2 text-xs text-[#B8BCC4]">Hubungi superadmin untuk mengatur ulang password Anda.</p>
        )}

        {error && (
          <p className="rounded-lg border border-[#E5484D]/40 bg-[#E5484D]/10 px-3 py-2 text-sm text-[#E5484D]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#73AE43] text-sm font-bold text-white transition-colors hover:bg-[#65993a] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && <SpinnerIcon className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
