import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { StudentTaskState, SubmissionStatus, TaskType } from "@/modules/ojol/api/policy";
import { TASK_TYPE_LABEL, scoreTone } from "@/modules/ojol/api/policy";

// Primitif tampilan app & situs Ojol (tema terang). Panel admin memakai komponen Core.

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANT: Record<Variant, string> = {
  primary: "bg-ojol-primary text-white hover:bg-ojol-primary-hover",
  secondary: "bg-ojol-surface text-ojol-ink ring-1 ring-inset ring-ojol-line hover:bg-ojol-paper",
  ghost: "text-ojol-muted hover:bg-ojol-primary-soft hover:text-ojol-ink",
  danger: "bg-ojol-danger text-white hover:opacity-90",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    VARIANT[variant],
    className,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export const inputClass =
  "block h-11 w-full min-w-0 rounded-xl bg-ojol-surface px-3.5 text-base text-ojol-ink ring-1 ring-inset ring-ojol-line outline-none transition placeholder:text-ojol-muted/60 focus:ring-2 focus:ring-ojol-primary disabled:opacity-60 sm:text-sm";
export const textareaClass = cn(inputClass, "h-auto min-h-28 py-3 leading-relaxed");

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ojol-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-ojol-muted">{hint}</p>}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl bg-ojol-surface p-5 ring-1 ring-ojol-line sm:p-6", className)} {...props} />;
}

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ojol-ink sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ojol-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-ojol-ink">{children}</h2>
      {action}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-ojol-surface px-6 py-12 text-center ring-1 ring-ojol-line">
      <p className="font-medium text-ojol-ink">{title}</p>
      {children && <div className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ojol-muted">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "danger" | "warning"; children: ReactNode }) {
  const tones = {
    info: "bg-ojol-primary-soft text-ojol-primary",
    success: "bg-ojol-success-soft text-ojol-success",
    danger: "bg-ojol-danger-soft text-ojol-danger",
    warning: "bg-ojol-warning-soft text-ojol-warning",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl px-4 py-3 text-sm leading-relaxed", tones[tone])}>
      {children}
    </div>
  );
}

type PillTone = "neutral" | "primary" | "success" | "warning" | "danger" | "gold";
const PILL: Record<PillTone, string> = {
  neutral: "bg-ojol-paper text-ojol-muted ring-1 ring-inset ring-ojol-line",
  primary: "bg-ojol-primary-soft text-ojol-primary",
  success: "bg-ojol-success-soft text-ojol-success",
  warning: "bg-ojol-warning-soft text-ojol-warning",
  danger: "bg-ojol-danger-soft text-ojol-danger",
  gold: "bg-ojol-gold-soft text-ojol-gold",
};

export function Pill({ tone = "neutral", children, className }: { tone?: PillTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", PILL[tone], className)}>
      {children}
    </span>
  );
}

const STATE_PILL: Record<StudentTaskState, { tone: PillTone; label: string }> = {
  todo: { tone: "primary", label: "Belum dikerjakan" },
  pending: { tone: "warning", label: "Menunggu koreksi" },
  rejected: { tone: "danger", label: "Perlu diulang" },
  approved: { tone: "success", label: "Selesai" },
  locked: { tone: "neutral", label: "Terkunci" },
};

export function TaskStatePill({ state }: { state: StudentTaskState }) {
  const { tone, label } = STATE_PILL[state];
  return <Pill tone={tone}>{label}</Pill>;
}

const SUBMISSION_PILL: Record<SubmissionStatus, { tone: PillTone; label: string }> = {
  pending: { tone: "warning", label: "Menunggu" },
  approved: { tone: "success", label: "Disetujui" },
  rejected: { tone: "danger", label: "Ditolak" },
};

export function SubmissionPill({ status }: { status: SubmissionStatus }) {
  const { tone, label } = SUBMISSION_PILL[status];
  return <Pill tone={tone}>{label}</Pill>;
}

export function TypePill({ type }: { type: TaskType }) {
  return <Pill tone={type === "quiz" ? "gold" : "neutral"}>{TASK_TYPE_LABEL[type]}</Pill>;
}

export function LatePill({ late }: { late: boolean }) {
  return late ? <Pill tone="danger">Terlambat</Pill> : <Pill tone="success">Tepat waktu</Pill>;
}

export function ScoreBadge({ score }: { score: number }) {
  const tone = { good: "success", fair: "warning", low: "danger" } as const;
  return <Pill tone={tone[scoreTone(score)]}>{score}</Pill>;
}

export function Stat({ label, value, hint, emphasis = false }: { label: string; value: ReactNode; hint?: string; emphasis?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-4 ring-1 sm:p-5", emphasis ? "bg-ojol-primary text-white ring-ojol-primary" : "bg-ojol-surface ring-ojol-line")}>
      <p className={cn("text-xs font-medium", emphasis ? "text-white/70" : "text-ojol-muted")}>{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className={cn("mt-1 text-xs", emphasis ? "text-white/70" : "text-ojol-muted")}>{hint}</p>}
    </div>
  );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- foto privat lewat endpoint berizin, bukan aset statis
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-ojol-primary-soft text-xs font-semibold text-ojol-primary"
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </span>
  );
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export const formatDate = (date: Date) => dateFormatter.format(date);
export const formatDateTime = (date: Date) => `${dateTimeFormatter.format(date)} WIB`;

/** Sisa waktu singkat untuk tenggat, mis. "2 hari lagi" / "lewat 3 jam". */
export function deadlineLabel(deadline: Date, now = new Date()): string {
  const diff = deadline.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const text = abs < 3_600_000 ? "kurang dari 1 jam" : hours < 48 ? `${hours} jam` : `${days} hari`;
  return diff >= 0 ? `${text} lagi` : `lewat ${text}`;
}

/** Nilai untuk input datetime-local dalam WIB. */
export function toWibInputValue(date: Date): string {
  const wib = new Date(date.getTime() + 7 * 3_600_000);
  return wib.toISOString().slice(0, 16);
}
