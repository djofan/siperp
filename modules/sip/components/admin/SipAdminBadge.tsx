const TONE_CLASS = {
  primary: "bg-sip-lime text-sip-ink",
  secondary: "bg-sip-lime/15 text-sip-lime",
  neutral: "bg-white/[0.06] text-white/50",
  danger: "bg-red-500/15 text-red-300",
  overlay: "bg-white/20 text-white backdrop-blur-sm",
} as const;

export function SipAdminBadge({
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
