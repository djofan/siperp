import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { cn } from "./ui/utils";
export function MetricCard({ label, value, detail, icon, tone = "emerald" }: { label: string; value: number | string; detail?: string; icon: ReactNode; tone?: "emerald" | "blue" | "amber" | "violet" }) {
  const tones = { emerald: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600" };
  return <Card className="border-slate-200 shadow-sm"><CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3"><p className="text-sm font-medium text-slate-500">{label}</p><span className={cn("flex size-9 items-center justify-center rounded-lg [&_svg]:size-4", tones[tone])}>{icon}</span></CardHeader><CardContent className="px-5 pb-5"><p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>{detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}</CardContent></Card>;
}
