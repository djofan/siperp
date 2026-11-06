import type { HTMLAttributes } from "react";
import { Card as ShadcnCard, CardHeader as ShadcnCardHeader } from "./card";
import { cn } from "./utils";
export { CardTitle, CardDescription } from "./card";
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <ShadcnCardHeader className={cn("p-0 pb-4", className)} {...props} />; }
export function Card({ className, tone = "default", ...props }: HTMLAttributes<HTMLDivElement> & { tone?: "default" | "danger" }) {
  return <ShadcnCard className={cn("p-5 shadow-sm sm:p-6", tone === "danger" && "border-red-100 bg-red-50", className)} {...props} />;
}
