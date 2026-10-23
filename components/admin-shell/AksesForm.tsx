"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/FormField";
import { Switch } from "@/components/ui/Switch";
import { bantuanRoles } from "@/contracts/modules/bantuan";

interface ModuleOption {
  id: string;
  name: string;
  slug?: string;
}

interface AccessState {
  enabled: boolean;
  role: string;
}

export function AksesForm({
  userId,
  modules,
  initialAccess,
}: {
  userId: string;
  modules: ModuleOption[];
  initialAccess: { moduleId: string; role: string }[];
}) {
  const router = useRouter();
  const [access, setAccess] = useState<Record<string, AccessState>>(() => {
    const initial: Record<string, AccessState> = {};
    for (const mod of modules) {
      const granted = initialAccess.find((entry) => entry.moduleId === mod.id);
      initial[mod.id] = { enabled: Boolean(granted), role: granted?.role ?? "admin" };
    }
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleModule(moduleId: string, enabled: boolean) {
    setAccess((prev) => ({ ...prev, [moduleId]: { ...prev[moduleId], enabled } }));
  }

  function setRole(moduleId: string, role: string) {
    setAccess((prev) => ({ ...prev, [moduleId]: { ...prev[moduleId], role } }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const entries = Object.entries(access)
      .filter(([, state]) => state.enabled)
      .map(([moduleId, state]) => ({ moduleId, role: state.role }));

    try {
      const response = await fetch(`/api/super/akun/${userId}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!response.ok) {
        const body = await response.json();
        const details = body.error?.details;
        const first = details && typeof details === "object" ? Object.values(details).flat()[0] : null;
        throw new Error(typeof first === "string" ? first : body.error?.message ?? "Akses belum dapat disimpan.");
      }
      router.push("/admin/super/akun");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Koneksi gagal. Coba kembali.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {modules.length === 0 ? (
        <p className="text-sm text-foreground/40">Belum ada modul terdaftar.</p>
      ) : (
        <div className="divide-y divide-border rounded-xl bg-surface-muted">
          {modules.map((module) => {
            const state = access[module.id];
            return (
              <div key={module.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={state.enabled}
                    onChange={(checked) => toggleModule(module.id, checked)}
                    aria-label={`Akses ke ${module.name}`}
                  />
                  <span className="text-sm font-medium text-foreground">{module.name}</span>
                </div>
                <Select
                  value={state.role}
                  disabled={!state.enabled}
                  onChange={(e) => setRole(module.id, e.target.value)}
                  className="h-9 w-32"
                >
                  <option value="admin">Admin</option>
                  {module.slug === "bantuan" ? Object.entries(bantuanRoles).filter(([role]) => role !== "admin").map(([role, label]) => <option key={role} value={role}>{label}</option>) : module.slug === "teknisi" ? <><option value="manager">Manajer</option><option value="technician">Teknisi</option><option value="monitoring">Monitoring (lihat saja)</option></> : <option value="editor">Editor</option>}
                </Select>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan Akses"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  );
}
