"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/Switch";

// Dipakai untuk status akun (/api/super/akun/:id/status) dan modul (/api/super/modul/:id/status).
export function ActiveToggle({
  endpoint,
  initialActive,
  subject = "akun",
}: {
  endpoint: string;
  initialActive: boolean;
  subject?: string;
}) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialActive);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    const previous = isActive;
    setIsActive(next);
    setError(null);

    startTransition(async () => {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setIsActive(previous);
        setError(data?.error ?? "Gagal mengubah status.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Switch
          checked={isActive}
          onChange={handleChange}
          disabled={isPending}
          aria-label={isActive ? `Nonaktifkan ${subject}` : `Aktifkan ${subject}`}
        />
        <span className={isActive ? "text-xs font-medium text-success" : "text-xs font-medium text-danger"}>
          {isActive ? "Aktif" : "Nonaktif"}
        </span>
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
