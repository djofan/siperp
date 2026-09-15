const TONE_CLASS = {
  primary: "bg-sip-primary-900 text-white",
  secondary: "bg-sip-secondary-50 text-sip-secondary-700",
  neutral: "bg-sip-primary-900/5 text-sip-primary-900/50",
  danger: "bg-red-50 text-red-700",
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
