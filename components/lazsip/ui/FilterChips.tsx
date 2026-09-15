import Link from "next/link";

export function FilterChips<T extends string>({
  options,
  value,
  buildHref,
}: {
  options: { value: T; label: string }[];
  value: T;
  buildHref: (value: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <Link
            key={opt.value}
            href={buildHref(opt.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-lazsip-primary-900 bg-lazsip-primary-900 text-white"
                : "border-lazsip-primary-200 bg-white text-lazsip-primary-800 hover:border-lazsip-primary-400"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
