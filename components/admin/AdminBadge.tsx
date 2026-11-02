const TONE_CLASS = {
  primary: "bg-lazsip-primary-900 text-white",
  secondary: "bg-lazsip-secondary-50 text-lazsip-secondary-700 dark:bg-lazsip-secondary-900/40 dark:text-lazsip-secondary-300",
  neutral: "bg-lazsip-primary-900/5 text-lazsip-primary-900/50 dark:bg-white/10 dark:text-white/60",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  overlay: "bg-white/20 text-white backdrop-blur-sm",
} as const;

export function AdminBadge({
  tone = "neutral",
  size = "md",
  children,
}: {
  tone?: keyof typeof TONE_CLASS;
  size?: "md" | "sm";
  children: React.ReactNode;
}) {
  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[11px]";
  return <span className={`inline-flex items-center rounded-full font-bold ${sizeClass} ${TONE_CLASS[tone]}`}>{children}</span>;
}
