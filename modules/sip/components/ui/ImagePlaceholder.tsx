type Variant = "blog" | "program" | "activity" | "person";

const ICONS: Record<Variant, string> = {
  blog: "M4 4h16v4H4zM4 10h16v10H4zM8 14h8M8 17h5",
  program: "M12 3l8 4-8 4-8-4 8-4zM4 11v6l8 4 8-4v-6",
  activity: "M8 3v4M16 3v4M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6",
};

export function ImagePlaceholder({
  variant = "blog",
  src,
  alt = "",
  className = "",
  imgClassName = "",
}: {
  variant?: Variant;
  src?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
}) {
  if (src) {
    return (
      <div className={`overflow-hidden bg-sip-primary-50 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- URL gambar bebas dari admin, belum lewat image storage terkelola */}
        <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${imgClassName}`} />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center overflow-hidden bg-sip-primary-50 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7 text-sip-primary-300"
        aria-hidden
      >
        <path d={ICONS[variant]} />
      </svg>
    </div>
  );
}
