import type { SVGProps } from "react";

// Satu set ikon garis tipis untuk modul Tanwir (fungsional, bukan dekorasi).
const PATHS = {
  emblem: "M12 3 14 6l3.5-.5.5 3.5 3 3-3 2-.5 3.5L14 18l-2 3-2-3-3.5.5L6 15l-3-3 3-2 .5-3.5L10 6zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 21 21",
  home: "M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z",
  tasks: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  review: "M4 12.5 9 17.5 20 6.5",
  students: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7",
  user: "M19 20v-1.5A3.5 3.5 0 0 0 15.5 15h-7A3.5 3.5 0 0 0 5 18.5V20M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  logout: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zM18.5 11.5a6.5 6.5 0 0 1-13 0M12 18v3",
  video: "M15.5 10.5 20 8v8l-4.5-2.5M5 7h9a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 14 17H5a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 5 7z",
  upload: "M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z",
  plus: "M12 5v14M5 12h14",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 18l-6-6 6-6",
  chevronRight: "M9 6l6 6-6 6",
  check: "M5 12.5 10 17.5 19 7",
  x: "M6 6l12 12M18 6 6 18",
  quiz: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  stop: "M7 7h10v10H7z",
  trash: "M4.5 7h15M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7M9 7V4.5h6V7",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  whatsapp: "M4 20l1.3-3.8A8 8 0 1 1 8 19zM9 9.5c.3 2.1 2.4 4.2 4.5 4.5l1-1.1 2 .9-.4 1.6c-3.7.2-7.4-3.4-7.2-7.2l1.6-.4.9 2z",
  map: "M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6zM9 4v14M15 6v14",
  menu: "M4 7h16M4 12h16M4 17h16",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-5 w-5", ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className} {...props}>
      <path d={PATHS[name]} />
    </svg>
  );
}
