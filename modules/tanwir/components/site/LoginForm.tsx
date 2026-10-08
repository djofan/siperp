"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/modules/tanwir/components/icons";
import { Field, Notice, buttonClass, inputClass } from "@/modules/tanwir/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/tanwir/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: data.get("code"), password: data.get("password") }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "Tidak dapat masuk.");
        return;
      }
      router.replace(body?.redirectTo ?? "/tanwir");
      router.refresh();
    } catch {
      setError("Tidak dapat masuk. Periksa koneksi lalu coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} method="post" className="space-y-5">
      <Field label="Kode akun" htmlFor="tanwir-code">
        <input
          id="tanwir-code"
          name="code"
          required
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="GTQ001"
          onChange={(event) => { event.currentTarget.value = event.currentTarget.value.toUpperCase(); }}
          maxLength={20}
          className={`${inputClass} uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal`}
        />
      </Field>
      <Field label="Password" htmlFor="tanwir-password">
        <div className="relative">
          <input
            id="tanwir-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            maxLength={72}
            className={`${inputClass} pr-20`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute inset-y-0 right-0 my-auto min-h-11 rounded-lg px-2.5 text-xs font-medium text-tanwir-muted hover:bg-tanwir-paper"
          >
            {showPassword ? "Sembunyikan" : "Lihat"}
          </button>
        </div>
      </Field>
      {error && <Notice tone="danger">{error}</Notice>}
      <button type="submit" disabled={pending} className={buttonClass("primary", "h-12 w-full")}>
        {pending ? "Memeriksa…" : "Masuk"}
        {!pending && <Icon name="arrowRight" className="h-4 w-4" />}
      </button>
    </form>
  );
}
