import { SunIcon, MoonIcon } from "@/components/ui/icons";
import type { AcademyTheme } from "@/modules/academy/components/admin/useAcademyTheme";

export function AcademyThemeToggle({ theme, onToggle }: { theme: AcademyTheme; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === "dark" ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
      title={theme === "dark" ? "Tema terang" : "Tema gelap"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-surface-muted"
    >
      {theme === "dark" ? <SunIcon className="h-4.5 w-4.5" /> : <MoonIcon className="h-4.5 w-4.5" />}
    </button>
  );
}
