"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import { Switch } from "@/components/ui/Switch";
import { panelClasses } from "@/components/ui/panel";

interface ModuleOption {
  id: string;
  name: string;
}

export function AkunForm({ modules }: { modules: ModuleOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleModule(moduleId: string, enabled: boolean) {
    setModuleIds((prev) => (enabled ? [...prev, moduleId] : prev.filter((id) => id !== moduleId)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/super/akun", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, isSuperadmin, moduleIds }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal membuat akun.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/super/akun");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={panelClasses("p-6")}>
          <h2 className="text-sm font-semibold text-foreground">Informasi Dasar</h2>
          <p className="mt-1 text-sm text-foreground/50">Nama, email, dan password untuk login.</p>

          <div className="mt-5 flex flex-col gap-4">
            <FormField label="Nama" htmlFor="name">
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>

            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <FormField label="Password" htmlFor="password" hint="Minimal 8 karakter">
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <div className={panelClasses("p-6")}>
          <h2 className="text-sm font-semibold text-foreground">Hak Akses</h2>
          <p className="mt-1 text-sm text-foreground/50">Tentukan level akses akun ini.</p>

          <label className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-surface-muted px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-foreground">Superadmin</p>
              <p className="text-xs text-foreground/50">Otomatis akses semua modul.</p>
            </div>
            <Switch checked={isSuperadmin} onChange={setIsSuperadmin} aria-label="Jadikan superadmin" />
          </label>

          {!isSuperadmin && (
            <div className="mt-4 flex flex-col gap-2">
              <span className="px-1 text-xs font-semibold tracking-wide text-foreground/40 uppercase">
                Akses Modul
              </span>
              {modules.length === 0 ? (
                <p className="px-1 text-sm text-foreground/40">Belum ada modul terdaftar.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-surface-muted">
                  {modules.map((module) => (
                    <label
                      key={module.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-foreground"
                    >
                      {module.name}
                      <Switch
                        checked={moduleIds.includes(module.id)}
                        onChange={(checked) => toggleModule(module.id, checked)}
                        aria-label={`Akses ke ${module.name}`}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan Akun"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  );
}
