import type { ReactNode } from "react";

export function ContentBackdrop({ children }: { children: ReactNode }) {
  return <div className="min-h-[80vh] bg-slate-900 bg-[url('/sarsip-landscape.svg')] bg-cover bg-center lg:bg-fixed">
    {children}
  </div>;
}
