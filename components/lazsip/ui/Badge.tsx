type Tone = "primary" | "secondary" | "neutral";

const TONES: Record<Tone, string> = {
  primary: "bg-lazsip-primary-50 text-lazsip-primary-700",
  secondary: "bg-lazsip-secondary-50 text-lazsip-secondary-700",
  neutral: "bg-lazsip-primary-900/5 text-lazsip-primary-900/70",
};

export function Badge({ children, tone = "primary" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-bold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
