import type { ReactNode } from "react";

export function PageIntroRow({ children }: { children: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-center gap-x-7 gap-y-3 sm:gap-x-9 [&>span]:!m-0">{children}</div>;
}
