"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function DeleteAkunButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Hapus akun "${userName}"? Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    const response = await fetch(`/api/super/akun/${userId}`, { method: "DELETE" });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menghapus akun.");
      setIsDeleting(false);
      return;
    }

    router.push("/admin/super/akun");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="danger" onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? "Menghapus..." : "Hapus Akun"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
