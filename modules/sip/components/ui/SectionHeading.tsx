import type { ReactNode } from "react";

// Kata aksen di judul section — satu titik warna hijau logo, tanpa italic.
export function AccentText({ children }: { children: ReactNode }) {
  return <span className="text-sip-primary-500">{children}</span>;
}

/**
 * Judul dari admin: kata yang dibungkus *bintang* tampil dengan warna aksen hijau logo,
 * mis. "Kabar *Terbaru* dari SIP".
 */
export function AccentTitle({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <AccentText key={i}>{part}</AccentText> : part))}
    </>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  tone = "light",
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: React.ReactNode;
  /** "light" = section berlatar putih/krem (default). "dark" = pita hijau tua (Jangkauan). */
  tone?: "light" | "dark";
  align?: "left" | "center";
}) {
  const isDark = tone === "dark";
  const centered = align === "center";
  return (
    <div
      className={`flex flex-col gap-5 ${centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"}`}
    >
      <div className={centered ? "flex flex-col items-center" : ""}>
        {eyebrow && (
          <span
            className={`mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${
              isDark ? "text-sip-primary-300" : "text-sip-primary-600"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isDark ? "bg-sip-primary-300" : "bg-sip-primary-500"}`} />
            {eyebrow}
          </span>
        )}
        <h2
          className={`max-w-2xl text-balance text-[1.75rem] font-bold leading-[1.2] tracking-tight sm:text-4xl lg:text-[2.5rem] ${
            isDark ? "text-white" : "text-sip-primary-900"
          }`}
        >
          {title}
        </h2>
        {description && (
          <p className={`mt-3 max-w-xl text-base leading-relaxed ${isDark ? "text-white/65" : "text-sip-primary-900/60"}`}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
