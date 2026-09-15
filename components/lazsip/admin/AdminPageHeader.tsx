export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-lazsip-primary-800/60">{description}</p>}
      </div>
      {action}
    </div>
  );
}
