"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";

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
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
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

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isSuperadmin}
            onChange={(e) => setIsSuperadmin(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Jadikan superadmin (otomatis akses semua modul)
        </label>

        {!isSuperadmin && (
          <div className="flex flex-col gap-2 rounded-lg bg-surface-muted p-4">
            <span className="text-sm font-medium text-foreground">Akses Modul</span>
            {modules.length === 0 ? (
              <span className="text-sm text-foreground/40">Belum ada modul terdaftar.</span>
            ) : (
              <div className="flex flex-col gap-2">
                {modules.map((module) => (
                  <label key={module.id} className="flex items-center gap-2 text-sm text-foreground/80">
                    <input
                      type="checkbox"
                      checked={moduleIds.includes(module.id)}
                      onChange={(e) =>
                        setModuleIds((prev) =>
                          e.target.checked
                            ? [...prev, module.id]
                            : prev.filter((id) => id !== module.id)
                        )
                      }
                      className="h-4 w-4 rounded border-border accent-accent"
                    />
                    {module.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
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
