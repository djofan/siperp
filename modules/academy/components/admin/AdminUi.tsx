import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "../ui/badge";
import { buttonVariants } from "@/modules/academy/components/ui/ButtonCompat";

export function AdminHeading({ title, description, backHref, action }: {
  title: string; description?: string; backHref?: string; action?: ReactNode;
}) {
  return <header className="mb-6">
    {backHref && <Link href={backHref} className="mb-4 inline-block text-sm font-medium text-accent hover:underline">← Kembali</Link>}
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/60">{description}</p>}
      </div>{action}
    </div>
  </header>;
}

export function AddLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className={buttonVariants({ className: "rounded-lg px-4" })}>{children}</Link>;
}

export function PublishBadge({ published }: { published: boolean }) {
  return <Badge variant="secondary" className={published ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "text-slate-500"}>{published ? "Terpublikasi" : "Draft"}</Badge>;
}

export function SavedNotice({ saved }: { saved: boolean }) {
  return saved ? <p role="status" className="mb-5 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">Perubahan berhasil disimpan.</p> : null;
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-surface p-8 text-center text-sm text-foreground/60">{children}</p>;
}
