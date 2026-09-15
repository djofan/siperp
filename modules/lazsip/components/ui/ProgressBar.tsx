export function ProgressBar({ percent, tone = "default" }: { percent: number; tone?: "default" | "light" }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const trackClass = tone === "light" ? "bg-white/25" : "bg-lazsip-primary-100";
  const fillClass = tone === "light" ? "bg-white" : "bg-lazsip-primary-700";
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full ${trackClass}`}>
      <div className={`h-full rounded-full transition-[width] ${fillClass}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
