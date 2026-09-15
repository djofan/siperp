"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/FormField";

const STATUS_OPTIONS = [
  { value: "baru", label: "Baru" },
  { value: "diproses", label: "Diproses" },
  { value: "diterima", label: "Diterima" },
  { value: "ditolak", label: "Ditolak" },
];

export function ApplicantStatusSelect({
  applicantId,
  initialStatus,
}: {
  applicantId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    setStatus(next);
    startTransition(async () => {
      await fetch(`/api/lazsip/applicants/${applicantId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    });
  }

  return (
    <Select
      value={status}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value)}
      className="h-8 w-36 text-xs"
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
