import { panelClasses } from "@/components/ui/panel";

export function AdminEmptyState({ message }: { message: string }) {
  return (
    <div className={panelClasses("flex flex-col items-center gap-3 p-12 text-center")}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lazsip-primary-50 text-lazsip-primary-400 dark:bg-white/10 dark:text-lazsip-primary-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
        </svg>
      </span>
      <p className="text-sm text-lazsip-primary-800/55 dark:text-white/55">{message}</p>
    </div>
  );
}
