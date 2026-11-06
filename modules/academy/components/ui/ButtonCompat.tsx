import type { ButtonHTMLAttributes } from "react";
import { Button as ShadcnButton, buttonVariants as shadcnVariants } from "./button";
type Variant = "primary" | "secondary" | "danger" | "ghost";
const variants = { primary: "default", secondary: "outline", danger: "destructive", ghost: "ghost" } as const;
export function buttonVariants({ variant = "primary", size = "md", className }: { variant?: Variant; size?: "sm" | "md"; className?: string } = {}) {
  return shadcnVariants({ variant: variants[variant], size: size === "sm" ? "sm" : "default", className });
}
export function Button({ variant = "primary", size = "md", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return <ShadcnButton variant={variants[variant]} size={size === "sm" ? "sm" : "default"} {...props} />;
}
