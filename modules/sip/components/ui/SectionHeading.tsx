export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <span className="mb-4 inline-flex items-center rounded-full bg-sip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-sip-primary-800">
            {eyebrow}
          </span>
        )}
        <h2 className="text-[2rem] font-extrabold leading-[1.15] tracking-tight text-balance text-sip-primary-900 sm:text-5xl lg:text-[3.5rem]">
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-xl text-base leading-relaxed text-sip-secondary-700 sm:text-lg">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
