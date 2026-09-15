"use client";

import { useState, type FormEvent } from "react";

export function ApplyForm({ programId }: { programId: string }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/lazsip/programs/${programId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal mengirim pendaftaran.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-sm font-medium text-lazsip-primary-800">
        Pendaftaran terkirim. Tim LAZSIP akan menghubungi kamu.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        required
        placeholder="Nama lengkap"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-11 rounded-full border border-lazsip-primary-200 bg-white px-5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
      />
      <input
        type="text"
        required
        placeholder="Nomor WhatsApp / email"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        className="h-11 rounded-full border border-lazsip-primary-200 bg-white px-5 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lazsip-primary-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Mengirim..." : "Daftar Sekarang"}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
        </svg>
      </button>
    </form>
  );
}
