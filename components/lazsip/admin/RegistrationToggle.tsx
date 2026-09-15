"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/lazsip/admin/Toggle";

export function RegistrationToggle({
  programId,
  initialOpen,
}: {
  programId: string;
  initialOpen: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setOpen(next);
    startTransition(async () => {
      await fetch(`/api/lazsip/programs/${programId}/registration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationOpen: next }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Toggle checked={open} onChange={handleChange} disabled={isPending} label="Buka/tutup pendaftaran" />
      <span className={`text-xs font-medium ${open ? "text-lazsip-secondary-700" : "text-amber-700"}`}>
        {open ? "Dibuka" : "Ditutup"}
      </span>
    </div>
  );
}
